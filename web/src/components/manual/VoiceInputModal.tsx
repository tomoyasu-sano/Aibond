"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { ManualItem } from "@/types/manual";

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  userLanguage?: string; // ユーザーのメイン言語
  onItemsGenerated: (items: ManualItem[]) => void;
}

interface GeneratedItem {
  category: string;
  question: string;
  answer: string;
  date?: string;
}

export function VoiceInputModal({
  isOpen,
  onClose,
  targetUserId,
  userLanguage = "ja",
  onItemsGenerated,
}: VoiceInputModalProps) {
  const t = useTranslations("manual");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<"recording" | "preview">("recording");

  const recognitionRef = useRef<any>(null);

  // 言語コードをWeb Speech API形式に変換
  const getRecognitionLanguage = (lang: string) => {
    const languageMap: Record<string, string> = {
      ja: "ja-JP",
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      zh: "zh-CN",
      ko: "ko-KR",
    };
    return languageMap[lang] || "ja-JP"; // デフォルトは日本語
  };

  useEffect(() => {
    // Web Speech APIのサポートチェック
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        toast.error("このブラウザは音声認識に対応していません");
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = getRecognitionLanguage(userLanguage);
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";

        // event.resultIndexから新しい結果のみを処理（重複を防ぐ）
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("マイクへのアクセスが拒否されました");
        } else if (event.error === "no-speech") {
          toast.error("音声が検出されませんでした");
        } else {
          toast.error("音声認識エラーが発生しました");
        }
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // 自動的に再開
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [userLanguage, isRecording]);

  const startRecording = async () => {
    try {
      // マイク権限を要求
      await navigator.mediaDevices.getUserMedia({ audio: true });

      setTranscript("");
      setIsRecording(true);
      recognitionRef.current?.start();
      toast.success("録音を開始しました");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("マイクへのアクセスに失敗しました");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    recognitionRef.current?.stop();
    toast.success("録音を停止しました");
  };

  const generateItems = async () => {
    if (!transcript.trim()) {
      toast.error("音声が認識されていません");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/manual/generate-from-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          targetUserId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate items");
      }

      const data = await res.json();

      if (data.items && data.items.length > 0) {
        setGeneratedItems(data.items);
        setStep("preview");
        toast.success(`${data.items.length}件の項目を生成しました`);
      } else {
        toast.error("音声から項目を抽出できませんでした");
      }
    } catch (error) {
      console.error("Error generating items:", error);
      toast.error("項目の生成に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveItems = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/manual/items/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: targetUserId,
          items: generatedItems,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save items");
      }

      const data = await res.json();
      onItemsGenerated(data.items);
      toast.success(`${data.items.length}件の項目を追加しました`);
      handleClose();
    } catch (error) {
      console.error("Error saving items:", error);
      toast.error("項目の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    setTranscript("");
    setGeneratedItems([]);
    setStep("recording");
    onClose();
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      basic: "基本情報",
      personality: "性格・気持ち",
      hobbies: "趣味・好み",
      communication: "コミュニケーション",
      lifestyle: "生活習慣",
      other: "その他",
    };
    return labels[category] || category;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>音声で追加</DialogTitle>
          <DialogDescription>
            {step === "recording"
              ? "マイクに向かって話してください。複数の情報を一度に話すことができます。"
              : "生成された項目を確認してください。"}
          </DialogDescription>
        </DialogHeader>

        {step === "recording" ? (
          <div className="space-y-4">
            {/* 録音コントロール */}
            <div className="flex flex-col items-center gap-4 py-6">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className="h-20 w-20 rounded-full"
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isRecording ? "録音中..." : "タップして録音開始"}
              </p>
            </div>

            {/* リアルタイムテキスト表示 */}
            {transcript && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">認識されたテキスト:</p>
                  <p className="text-sm whitespace-pre-wrap">{transcript}</p>
                </CardContent>
              </Card>
            )}

            {/* アクションボタン */}
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button
                onClick={generateItems}
                disabled={!transcript.trim() || isRecording || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "項目を生成"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 生成された項目のプレビュー */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {generatedItems.map((item, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-primary">
                          {getCategoryLabel(item.category)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setGeneratedItems((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          className="h-6 w-6 p-0"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.question}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.answer}
                        </p>
                        {item.date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📅 {item.date}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("recording");
                  setGeneratedItems([]);
                }}
              >
                やり直す
              </Button>
              <Button
                onClick={saveItems}
                disabled={isSaving || generatedItems.length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {generatedItems.length}件を追加
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
