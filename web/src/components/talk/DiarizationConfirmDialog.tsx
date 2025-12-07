"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: string;
  speaker_tag: number | null;
  original_text: string;
  translated_text: string | null;
  timestamp: string;
}

interface DiarizationConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onSwapSpeakers: () => Promise<void>;
  onChangeSpeaker?: (messageId: string, newSpeakerTag: number | null) => void;
  onClose: () => void;
  messages: Message[];
  speaker1Name?: string;
  speaker2Name?: string;
  isSwapping?: boolean;
}

export function DiarizationConfirmDialog({
  open,
  onConfirm,
  onSwapSpeakers,
  onChangeSpeaker,
  onClose,
  messages,
  speaker1Name = "話者1",
  speaker2Name = "話者2",
  isSwapping = false,
}: DiarizationConfirmDialogProps) {
  const [localSwapping, setLocalSwapping] = useState(false);
  // "main" = 通常の話者識別画面, "confirm" = 終了確認画面
  const [view, setView] = useState<"main" | "confirm">("main");

  const handleCloseAttempt = () => {
    setView("confirm");
  };

  const handleConfirmClose = () => {
    setView("main");
    onClose();
  };

  const handleCancelClose = () => {
    setView("main");
  };

  const handleSwap = async () => {
    setLocalSwapping(true);
    try {
      await onSwapSpeakers();
    } finally {
      setLocalSwapping(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ダイアログが閉じる時にviewをリセット
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleCloseAttempt();
    }
  };

  // 確認画面の表示
  if (view === "confirm") {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancelClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>確認</DialogTitle>
            <DialogDescription>
              話者識別を終了しますか？サマリーは作成されません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleCancelClose}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmClose}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // メイン画面の表示
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>話者識別の確認</DialogTitle>
          <DialogDescription>
            AIが話者を識別しました。以下の内容で正しいか確認してください。
            一括で入れ替える場合は「話者を入れ替え」ボタン、個別に修正する場合は各メッセージにホバーして鉛筆アイコンから変更できます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              メッセージがありません
            </p>
          ) : (
            messages.map((message) => {
              const speakerName =
                message.speaker_tag === 1
                  ? speaker1Name
                  : message.speaker_tag === 2
                  ? speaker2Name
                  : "不明";

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

              return (
                <div
                  key={message.id}
                  className={`flex ${getSpeakerAlignment()} group`}
                >
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${getSpeakerBg()}`}>
                    <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                      <span className="font-semibold">{speakerName}</span>
                      <span>•</span>
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {/* 個別話者変更セレクター */}
                      {onChangeSpeaker && (
                        <Select
                          value={message.speaker_tag === null ? "unknown" : String(message.speaker_tag)}
                          onValueChange={(value) => {
                            const newTag = value === "unknown" ? null : parseInt(value, 10);
                            onChangeSpeaker(message.id, newTag);
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
                            <SelectItem value="1">{speaker1Name}</SelectItem>
                            <SelectItem value="2">{speaker2Name}</SelectItem>
                            <SelectItem value="unknown">不明</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <p className="text-sm">{message.original_text}</p>
                    {message.translated_text && (
                      <p className="text-xs opacity-80 mt-1 italic">
                        {message.translated_text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleSwap}
            disabled={isSwapping || localSwapping}
          >
            {isSwapping || localSwapping ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                入れ替え中...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                話者を入れ替え
              </>
            )}
          </Button>
          <Button onClick={onConfirm}>
            この識別でOK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
