"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Talk {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: string;
  is_paused: boolean;
  speaker1_name: string | null;
  speaker2_name: string | null;
  summary: string | null;
}

interface Message {
  id: string;
  speaker_tag: number;
  original_text: string;
  original_language: string;
  translated_text: string | null;
  timestamp: string;
  is_final: boolean;
}

export default function TalkPage() {
  const router = useRouter();
  const params = useParams();
  const talkId = params.id as string;
  const t = useTranslations("talkDetail");
  const tt = useTranslations("talks");
  const tc = useTranslations("common");

  const [talk, setTalk] = useState<Talk | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs for streaming
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pcmChunksRef = useRef<Int16Array[]>([]);
  const sequenceRef = useRef(0);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isStoppingRef = useRef(false);

  // Refs for audio recording (保存用)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchTalk();
    return () => {
      cleanup();
    };
  }, [talkId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
      } catch (e) {}
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    // MediaRecorder cleanup
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    mediaRecorderRef.current = null;
    pcmChunksRef.current = [];
  };

  const fetchTalk = async () => {
    try {
      const res = await fetch(`/api/talks/${talkId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        router.push("/talks");
        return;
      }

      const data = await res.json();
      setTalk(data.talk);
      setMessages(data.messages || []);
      setIsPaused(data.talk.status === "paused");

      if (data.talk.status === "active" || data.talk.status === "paused") {
        const startTime = new Date(data.talk.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000) - (data.talk.total_pause_seconds || 0);
        setElapsedTime(Math.max(0, elapsed));
      }
    } catch (error) {
      console.error("Error fetching talk:", error);
      toast.error(t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /**
   * リアルタイム録音開始（SSE + AudioWorklet）
   */
  const startRecording = async () => {
    if (isConnecting || isRecording) return;

    setIsConnecting(true);
    isStoppingRef.current = false;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = sessionId;

    console.log("[Recording] Starting with sessionId:", sessionId);

    try {
      // 1. SSE接続（文字起こし結果の受信）
      await new Promise<void>((resolve, reject) => {
        const eventSource = new EventSource(
          `/api/stt/stream?sessionId=${sessionId}&talkId=${talkId}`
        );

        const timeoutId = setTimeout(() => {
          eventSource.close();
          reject(new Error("SSE connection timeout"));
        }, 30000);

        eventSource.addEventListener("ready", () => {
          console.log("[Recording] SSE Ready");
          clearTimeout(timeoutId);
          resolve();
        });

        eventSource.addEventListener("partial", (e) => {
          const data = JSON.parse(e.data);
          console.log("[Recording] Partial:", data.text);
          setInterimText(data.text);
        });

        eventSource.addEventListener("final", (e) => {
          const data = JSON.parse(e.data);
          console.log("[Recording] Final:", data.text, "Translated:", data.translatedText);
          setInterimText("");
          // DBに保存されるのでメッセージリストを更新
          setMessages((prev) => [
            ...prev,
            {
              id: data.id,
              speaker_tag: 1,
              original_text: data.text,
              original_language: "ja",
              translated_text: data.translatedText || null,
              timestamp: data.timestamp,
              is_final: true,
            },
          ]);
        });

        eventSource.addEventListener("error", (e: any) => {
          console.error("[Recording] SSE error", e);
          if (e.data) {
            try {
              const errorData = JSON.parse(e.data);
              toast.error(`エラー: ${errorData.message}`);
            } catch {}
          }
        });

        eventSourceRef.current = eventSource;
      });

      console.log("[Recording] SSE connected, starting audio capture");

      // 2. マイクアクセス
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      console.log("[Recording] Microphone access granted");
      mediaStreamRef.current = stream;

      // 3. AudioContext + AudioWorklet
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextCtor({
        sampleRate: 16000,
        latencyHint: "interactive",
      });
      audioContextRef.current = audioContext;

      await audioContext.resume();
      await audioContext.audioWorklet.addModule("/worklets/pcm16-processor.js");

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, "pcm16-processor");
      workletNodeRef.current = workletNode;

      pcmChunksRef.current = [];
      workletNode.port.onmessage = ({ data }) => {
        if (data instanceof Int16Array) {
          pcmChunksRef.current.push(data);
        } else if (data?.buffer) {
          pcmChunksRef.current.push(new Int16Array(data.buffer));
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      console.log("[Recording] AudioWorklet pipeline ready");

      // 4. MediaRecorder for audio saving (保存用)
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // 1秒ごとにチャンク生成
      mediaRecorderRef.current = mediaRecorder;
      console.log("[Recording] MediaRecorder started for audio saving");

      // 5. 500msごとに音声をアップロード（STT用）
      uploadIntervalRef.current = setInterval(async () => {
        if (pcmChunksRef.current.length === 0 || isStoppingRef.current) return;

        const chunks = pcmChunksRef.current.splice(0);
        const totalSamples = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Int16Array(totalSamples);

        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        const audioBlob = new Blob([combined.buffer], { type: "audio/pcm" });

        const formData = new FormData();
        formData.append("sessionId", sessionIdRef.current);
        formData.append("audio", audioBlob);
        formData.append("sequence", sequenceRef.current.toString());

        try {
          const response = await fetch("/api/stt/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            sequenceRef.current++;
          } else {
            console.error("[Recording] Upload failed");
          }
        } catch (error) {
          console.error("[Recording] Upload error", error);
        }
      }, 500);

      setIsRecording(true);
      setIsConnecting(false);
      startTimer();
      toast.success(t("recordingStarted"));
    } catch (error) {
      console.error("[Recording] Failed to start", error);
      cleanup();
      setIsConnecting(false);
      toast.error(t("recordingFailed"));
    }
  };

  const pauseRecording = async () => {
    stopTimer();
    // AudioWorkletを一時停止（アップロード停止）
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    // MediaRecorderを一時停止
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }

    try {
      await fetch(`/api/talks/${talkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      setIsPaused(true);
      toast.info(t("recordingPaused"));
    } catch (error) {
      console.error("Error pausing:", error);
    }
  };

  const resumeRecording = async () => {
    startTimer();

    // MediaRecorderを再開
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }

    // アップロード再開
    if (!uploadIntervalRef.current) {
      uploadIntervalRef.current = setInterval(async () => {
        if (pcmChunksRef.current.length === 0 || isStoppingRef.current) return;

        const chunks = pcmChunksRef.current.splice(0);
        const totalSamples = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Int16Array(totalSamples);

        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        const audioBlob = new Blob([combined.buffer], { type: "audio/pcm" });

        const formData = new FormData();
        formData.append("sessionId", sessionIdRef.current);
        formData.append("audio", audioBlob);
        formData.append("sequence", sequenceRef.current.toString());

        try {
          await fetch("/api/stt/upload", { method: "POST", body: formData });
          sequenceRef.current++;
        } catch {}
      }, 500);
    }

    try {
      await fetch(`/api/talks/${talkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
      setIsPaused(false);
      toast.info(t("recordingResumed"));
    } catch (error) {
      console.error("Error resuming:", error);
    }
  };

  const uploadAudioFile = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log("[Audio Upload] No audio chunks to upload");
      return;
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const durationSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);

      console.log("[Audio Upload] Uploading audio:", audioBlob.size, "bytes,", durationSeconds, "seconds");

      const formData = new FormData();
      formData.append("audio", audioBlob, `${talkId}.webm`);
      formData.append("duration", durationSeconds.toString());

      const res = await fetch(`/api/talks/${talkId}/audio`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        console.log("[Audio Upload] Success");
      } else {
        console.error("[Audio Upload] Failed:", await res.text());
      }
    } catch (error) {
      console.error("[Audio Upload] Error:", error);
    } finally {
      audioChunksRef.current = [];
    }
  };

  const stopRecording = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    console.log("[Recording] Stopping...");
    stopTimer();

    // MediaRecorderを停止して最後のチャンクを取得
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();
        } else {
          resolve();
        }
      });
    }

    // 音声ファイルをアップロード（バックグラウンドで実行）
    uploadAudioFile();

    cleanup();

    try {
      const res = await fetch(`/api/talks/${talkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });

      if (res.ok) {
        const data = await res.json();
        setTalk(data.talk);
        setIsRecording(false);
        setInterimText("");
        toast.success(t("recordingEndedMessage"));
        // サマリー画面へ遷移
        router.push(`/talks/${talkId}/summary`);
      } else if (res.status === 400) {
        setIsRecording(false);
        setInterimText("");
        await fetchTalk();
      }
    } catch (error) {
      console.error("Error stopping:", error);
      toast.error(t("endingFailed"));
    } finally {
      isStoppingRef.current = false;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header t={t} tt={tt} tc={tc} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!talk) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header t={t} tt={tt} tc={tc} />

      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col">
        {/* Recording Controls */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {talk.status === "completed" ? (
                  <span className="text-muted-foreground">
                    {t("recordingEnded")} • {talk.duration_minutes}{tc("minute")}
                  </span>
                ) : isRecording ? (
                  <>
                    <div className={`w-3 h-3 rounded-full ${isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"}`} />
                    <span className="font-mono text-2xl">{formatTime(elapsedTime)}</span>
                    <span className="text-sm text-muted-foreground">
                      {isPaused ? t("paused") : t("recording")}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="font-mono text-2xl">{formatTime(elapsedTime)}</span>
                    <span className="text-sm text-muted-foreground">
                      {isConnecting ? tc("loading") : t("standby")}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {talk.status === "completed" ? null : !isRecording ? (
                  <Button onClick={startRecording} disabled={isConnecting}>
                    {isConnecting ? tc("loading") : t("startRecording")}
                  </Button>
                ) : isPaused ? (
                  <>
                    <Button onClick={resumeRecording}>{t("resume")}</Button>
                    <Button variant="destructive" onClick={stopRecording}>{t("endButton")}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={pauseRecording}>{t("pause")}</Button>
                    <Button variant="destructive" onClick={stopRecording}>{t("endButton")}</Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("conversationContent")}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 && !interimText && (
                <p className="text-center text-muted-foreground py-8">
                  {isRecording
                    ? t("transcriptionWillAppear")
                    : t("noContent")}
                </p>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.speaker_tag === 1 ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.speaker_tag === 1
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {message.speaker_tag === 1 ? talk.speaker1_name : talk.speaker2_name}
                      {" • "}
                      {formatTimestamp(message.timestamp)}
                    </div>
                    <p>{message.original_text}</p>
                    {message.translated_text && (
                      <p className="text-sm opacity-80 mt-1 italic">
                        {message.translated_text}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {interimText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-blue-50 border border-blue-200">
                    <p className="text-blue-700">{interimText}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Header({ t, tt, tc }: { t: ReturnType<typeof useTranslations>; tt: ReturnType<typeof useTranslations>; tc: ReturnType<typeof useTranslations> }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/talks" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span>{tt("backToList")}</span>
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          {tc("appName")}
        </Link>
      </div>
    </header>
  );
}
