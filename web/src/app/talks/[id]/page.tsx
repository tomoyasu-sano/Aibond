"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { DiarizationConfirmDialog } from "@/components/talk/DiarizationConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  diarization_status: string | null;
  summary_status: string | null;
}

interface Message {
  id: string;
  speaker_tag: number | null;
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
  const [previousDiarizationStatus, setPreviousDiarizationStatus] = useState<boolean>(false);
  const [isSwappingSpeakers, setIsSwappingSpeakers] = useState(false);
  const [showDiarizationDialog, setShowDiarizationDialog] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showEndingDialog, setShowEndingDialog] = useState(false);
  const [endingStep, setEndingStep] = useState<"uploading" | "processing" | "done">("uploading");
  const [isSkipping, setIsSkipping] = useState(false);

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

  // 確認待ちステータスの場合、ダイアログを表示
  useEffect(() => {
    if (talk?.summary_status === "waiting_confirmation" && !showDiarizationDialog && !isConfirming && !isSkipping) {
      console.log("[Talk] Detected waiting_confirmation, showing dialog");
      toast.success("話者識別が完了しました。確認してください。");
      setShowDiarizationDialog(true);
    }
  }, [talk?.summary_status, showDiarizationDialog, isConfirming, isSkipping]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, interimText]);

  // Poll for message updates after talk completion (for diarization and summary)
  useEffect(() => {
    if (talk?.status === "completed") {
      // Check if any messages have null speaker tags (diarization in progress)
      const hasPendingDiarization = messages.some(m => m.speaker_tag === null);

      // Check if diarization just completed (speaker tags filled but not yet confirmed)
      if (previousDiarizationStatus && !hasPendingDiarization && messages.length > 0) {
        console.log("[Talk] Speaker tags filled!");
      }

      setPreviousDiarizationStatus(hasPendingDiarization);

      // ポーリング継続条件を拡張:
      // - 話者タグが null のメッセージがある（話者識別処理中）
      // - diarization_status が pending/processing（話者識別待ち/処理中）
      // - summary_status が pending/generating（サマリー生成待ち/処理中）
      // - summary_status が waiting_confirmation でなければ継続（確認待ちになるまでポーリング）
      const diarizationInProgress = ['pending', 'processing'].includes(talk.diarization_status || '');
      const summaryInProgress = ['pending', 'generating'].includes(talk.summary_status || '');
      const notYetWaitingConfirmation = talk.summary_status !== 'waiting_confirmation' &&
                                         talk.summary_status !== 'generated' &&
                                         talk.summary_status !== 'skipped' &&
                                         talk.summary_status !== 'failed';
      const shouldPoll = hasPendingDiarization || diarizationInProgress || summaryInProgress || notYetWaitingConfirmation;

      if (shouldPoll) {
        console.log("[Talk] Processing in progress, polling for updates...", {
          hasPendingDiarization,
          diarization_status: talk.diarization_status,
          summary_status: talk.summary_status,
          shouldPoll,
        });
        const interval = setInterval(fetchTalk, 3000); // Poll every 3 seconds for faster feedback
        return () => clearInterval(interval);
      } else {
        console.log("[Talk] Polling stopped", {
          diarization_status: talk.diarization_status,
          summary_status: talk.summary_status,
        });
      }
    }
  }, [talk?.status, talk?.diarization_status, talk?.summary_status, messages]);

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
          // DBに保存されるのでメッセージリストを更新（話者タグは後でBatchRecognizeで更新される）
          setMessages((prev) => [
            ...prev,
            {
              id: data.id,
              speaker_tag: null, // 話者識別は会話終了後にBatchRecognizeで実行
              original_text: data.text,
              original_language: "ja",
              translated_text: data.translatedText || null,
              timestamp: data.timestamp,
              is_final: true,
            },
          ]);
        });

        eventSource.addEventListener("error", (e: any) => {
          // SSE接続が正常に終了した場合も error イベントが発火するため、
          // 実際のエラーデータがある場合のみログとトーストを表示
          if (e.data) {
            try {
              const errorData = JSON.parse(e.data);
              console.error("[Recording] SSE error", errorData);
              toast.error(`エラー: ${errorData.message}`);
            } catch {
              console.warn("[Recording] SSE connection closed");
            }
          }
          // e.data がない場合は接続終了の正常なイベントなのでログしない
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

      // ステータスをactiveに更新（ready→active）
      try {
        await fetch(`/api/talks/${talkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
      } catch (e) {
        console.log("[Recording] Status update to active skipped (already active)");
      }

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

  const uploadAudioFile = async (): Promise<boolean> => {
    if (audioChunksRef.current.length === 0) {
      console.log("[Audio Upload] No audio chunks to upload");
      return false;
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
        return true;
      } else {
        console.error("[Audio Upload] Failed:", await res.text());
        return false;
      }
    } catch (error) {
      console.error("[Audio Upload] Error:", error);
      return false;
    } finally {
      audioChunksRef.current = [];
    }
  };

  const stopRecording = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    console.log("[Recording] Stopping...");
    stopTimer();

    // STTストリームを先に終了（タイムアウト回避）
    if (sessionIdRef.current) {
      console.log("[Recording] Ending STT stream...");
      try {
        await fetch("/api/stt/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });
        console.log("[Recording] STT stream ended");
      } catch (error) {
        console.error("[Recording] Failed to end STT stream:", error);
      }
    }

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

    setIsRecording(false);
    setInterimText("");

    // 終了処理ダイアログを表示
    setEndingStep("uploading");
    setShowEndingDialog(true);

    // 音声ファイルをアップロード（完了を待つ）
    const uploadSuccess = await uploadAudioFile();

    cleanup();

    if (!uploadSuccess) {
      setShowEndingDialog(false);
      toast.error("音声ファイルのアップロードに失敗しました");
      isStoppingRef.current = false;
      return;
    }

    setEndingStep("processing");

    try {
      const res = await fetch(`/api/talks/${talkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });

      if (res.ok) {
        const data = await res.json();
        // talk state を更新してポーリングを開始させる
        setTalk(data.talk);
        setEndingStep("done");
        console.log("[Recording] Talk ended, status:", data.talk.status, "summary_status:", data.talk.summary_status);
      } else if (res.status === 400) {
        setShowEndingDialog(false);
        await fetchTalk();
      }
    } catch (error) {
      console.error("Error stopping:", error);
      setShowEndingDialog(false);
      toast.error(t("endingFailed"));
    } finally {
      isStoppingRef.current = false;
    }
  };

  const handleGoToList = () => {
    setShowEndingDialog(false);
    router.push("/talks");
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

  const swapSpeakers = async () => {
    if (isSwappingSpeakers) return;

    setIsSwappingSpeakers(true);
    try {
      const res = await fetch(`/api/talks/${talkId}/swap-speakers`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[Swap Speakers] Success:", data);
        toast.success(`話者を入れ替えました (${data.swappedCount}件)`);

        // メッセージを再取得
        await fetchTalk();
      } else {
        const error = await res.json();
        console.error("[Swap Speakers] Error:", error);
        toast.error("話者の入れ替えに失敗しました");
      }
    } catch (error) {
      console.error("[Swap Speakers] Error:", error);
      toast.error("話者の入れ替えに失敗しました");
    } finally {
      setIsSwappingSpeakers(false);
    }
  };

  // 個別メッセージの話者設定（楽観的UI更新）
  const setMessageSpeaker = async (messageId: string, currentSpeakerTag: number | null, newSpeakerTag: number | null) => {
    if (currentSpeakerTag === newSpeakerTag) return; // 変更なし

    // 楽観的にUIを更新
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, speaker_tag: newSpeakerTag } : m
      )
    );

    try {
      const res = await fetch(`/api/talks/${talkId}/messages/${messageId}/swap-speaker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speaker_tag: newSpeakerTag }),
      });

      if (res.ok) {
        const data = await res.json();
        // サーバーの値で再同期
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, speaker_tag: data.message.speaker_tag } : m
          )
        );
      } else {
        // 失敗時は元に戻す
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, speaker_tag: currentSpeakerTag } : m
          )
        );
        toast.error("話者の変更に失敗しました");
      }
    } catch (error) {
      // エラー時は元に戻す
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, speaker_tag: currentSpeakerTag } : m
        )
      );
      console.error("[Set Message Speaker] Error:", error);
      toast.error("話者の変更に失敗しました");
    }
  };

  // 話者識別を確認してサマリー生成を開始
  const confirmDiarization = async () => {
    setShowDiarizationDialog(false);
    setIsConfirming(true);

    try {
      const res = await fetch(`/api/talks/${talkId}/confirm`, {
        method: "POST",
      });

      if (res.ok) {
        // サマリーページへ遷移（ダイアログは自動的に閉じる）
        router.push(`/talks/${talkId}/summary`);
      } else {
        const error = await res.json();
        console.error("[Confirm] Error:", error);
        toast.error("サマリー生成の開始に失敗しました");
        setIsConfirming(false);
      }
    } catch (error) {
      console.error("[Confirm] Error:", error);
      toast.error("サマリー生成の開始に失敗しました");
      setIsConfirming(false);
    }
  };

  // 話者識別をスキップしてサマリー生成を行わない
  const skipDiarization = async () => {
    setIsSkipping(true);
    setShowDiarizationDialog(false);

    try {
      const res = await fetch(`/api/talks/${talkId}/skip`, {
        method: "POST",
      });

      if (res.ok) {
        // talkの状態を更新
        await fetchTalk();
        toast.info("サマリー生成をスキップしました");
      } else {
        const error = await res.json();
        console.error("[Skip] Error:", error);
        toast.error("スキップに失敗しました");
      }
    } catch (error) {
      console.error("[Skip] Error:", error);
      toast.error("スキップに失敗しました");
    } finally {
      setIsSkipping(false);
    }
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

      {/* 話者識別確認ダイアログ */}
      <DiarizationConfirmDialog
        open={showDiarizationDialog}
        onConfirm={confirmDiarization}
        onSwapSpeakers={swapSpeakers}
        onChangeSpeaker={(messageId, newSpeakerTag) => {
          const message = messages.find(m => m.id === messageId);
          if (message) {
            setMessageSpeaker(messageId, message.speaker_tag, newSpeakerTag);
          }
        }}
        onClose={skipDiarization}
        messages={messages}
        speaker1Name={talk.speaker1_name || "話者1"}
        speaker2Name={talk.speaker2_name || "話者2"}
        isSwapping={isSwappingSpeakers}
      />

      {/* サマリー生成中ダイアログ */}
      <Dialog open={isConfirming} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              サマリーを作成中...
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                <p>会話内容を分析してサマリーを生成しています。</p>
                <p>しばらくお待ちください...</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* 録音終了処理ダイアログ */}
      <Dialog open={showEndingDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {endingStep === "done" ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {endingStep === "uploading" && "音声ファイルをアップロード中..."}
              {endingStep === "processing" && "処理を開始しています..."}
              {endingStep === "done" && "処理を開始しました"}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                {endingStep === "uploading" && (
                  <p>録音した音声をサーバーにアップロードしています。しばらくお待ちください。</p>
                )}
                {endingStep === "processing" && (
                  <p>話者識別処理を開始しています。この処理はバックグラウンドで実行されます。</p>
                )}
                {endingStep === "done" && (
                  <>
                    <p className="text-foreground font-medium">
                      話者識別処理がバックグラウンドで実行中です。
                    </p>
                    <ul className="bg-muted p-3 rounded-md text-sm space-y-2 list-none">
                      <li>✓ このページを離れても処理は継続されます</li>
                      <li>✓ 処理完了後、一覧画面で確認できます</li>
                      <li>✓ 通常1〜2分で完了します</li>
                    </ul>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {endingStep === "done" && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowEndingDialog(false); fetchTalk(); }}>
                この画面で待つ
              </Button>
              <Button onClick={handleGoToList}>
                一覧に戻る
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("conversationContent")}</CardTitle>
              <div className="flex items-center gap-2">
                {talk.status === "completed" &&
                 talk.summary_status !== "skipped" &&
                 messages.some(m => m.speaker_tag === null) && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                    話者識別処理中...
                  </span>
                )}
                {talk.status === "completed" &&
                 messages.length > 0 &&
                 !messages.some(m => m.speaker_tag === null) &&
                 (talk.summary_status === null || talk.summary_status === "waiting_confirmation") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={swapSpeakers}
                    disabled={isSwappingSpeakers}
                    className="text-xs"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    {isSwappingSpeakers ? "入れ替え中..." : "話者を入れ替え"}
                  </Button>
                )}
              </div>
            </div>
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

              {messages.map((message) => {
                const getSpeakerName = () => {
                  if (message.speaker_tag === null) {
                    return "処理中";
                  } else if (message.speaker_tag === 1) {
                    return talk.speaker1_name || "話者1";
                  } else {
                    return talk.speaker2_name || "話者2";
                  }
                };

                const getSpeakerAlignment = () => {
                  if (message.speaker_tag === null) return "justify-start";
                  return message.speaker_tag === 1 ? "justify-start" : "justify-end";
                };

                const getSpeakerBg = () => {
                  if (message.speaker_tag === null) {
                    return "bg-yellow-50 border border-yellow-200";
                  }
                  return message.speaker_tag === 1
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground";
                };

                // 話者識別完了後、サマリー生成前のみ個別変更を許可
                const canChangeSpeaker = talk.status === "completed" &&
                  (talk.summary_status === null || talk.summary_status === "waiting_confirmation");

                return (
                  <div
                    key={message.id}
                    className={`flex ${getSpeakerAlignment()} group`}
                  >
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${getSpeakerBg()}`}>
                      <div className="text-xs opacity-70 mb-1 flex items-center gap-2">
                        <span className="font-semibold">{getSpeakerName()}</span>
                        <span>•</span>
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {/* 話者変更セレクター */}
                        {canChangeSpeaker && (
                          <Select
                            value={message.speaker_tag === null ? "unknown" : String(message.speaker_tag)}
                            onValueChange={(value) => {
                              const newTag = value === "unknown" ? null : parseInt(value, 10);
                              setMessageSpeaker(message.id, message.speaker_tag, newTag);
                            }}
                          >
                            <SelectTrigger className="h-5 w-auto px-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity border-none bg-transparent hover:bg-black/10">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                              </svg>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">{talk.speaker1_name || "話者1"}</SelectItem>
                              <SelectItem value="2">{talk.speaker2_name || "話者2"}</SelectItem>
                              <SelectItem value="unknown">不明</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <p>{message.original_text}</p>
                      {message.translated_text && (
                        <p className="text-sm opacity-80 mt-1 italic">
                          {message.translated_text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

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
