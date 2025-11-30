"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Consultation {
  id: string;
  title: string;
  chat_history: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export default function AIChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    }>
      <AIChatContent />
    </Suspense>
  );
}

function AIChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Consultation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // URLパラメータから相談IDを取得
  const consultationId = searchParams.get("id");

  useEffect(() => {
    fetchConsultations();
  }, []);

  useEffect(() => {
    if (consultationId) {
      fetchConsultation(consultationId);
    } else {
      setCurrentConsultation(null);
      setMessages([]);
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConsultations = async () => {
    try {
      const res = await fetch("/api/ai-chat");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setConsultations(data.consultations || []);
    } catch (error) {
      console.error("Error fetching consultations:", error);
    }
  };

  const fetchConsultation = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-chat?id=${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        router.push("/ai-chat");
        return;
      }
      const data = await res.json();
      setCurrentConsultation(data.consultation);
      setMessages(data.consultation.chat_history || []);
    } catch (error) {
      console.error("Error fetching consultation:", error);
      toast.error("相談の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    // 楽観的更新
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setSending(true);
    setStreamingContent("");

    // AbortController作成
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: currentConsultation?.id,
          message: userMessage.content,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.slice(0, -1));
        toast.error(data.error || "送信に失敗しました");
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let newConsultationId: string | null = null;
      let fullContent = "";
      let timestamp = new Date().toISOString();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "start") {
                  newConsultationId = data.consultation_id;
                } else if (data.type === "chunk") {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                } else if (data.type === "done") {
                  timestamp = data.timestamp;
                } else if (data.type === "error") {
                  toast.error(data.message);
                  setMessages((prev) => prev.slice(0, -1));
                  setSending(false);
                  return;
                }
              } catch {
                // JSON parse error - ignore
              }
            }
          }
        }
      } catch (readError) {
        // 停止された場合
        if (readError instanceof Error && readError.name === "AbortError") {
          // 途中まで生成された内容があれば保存
          if (fullContent) {
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: fullContent + "\n\n（生成を停止しました）",
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          }
          setStreamingContent("");
          setSending(false);
          return;
        }
        throw readError;
      }

      // 完了時にAI応答をメッセージに追加
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: fullContent,
        timestamp: timestamp,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");

      // 新規相談の場合、URLを更新して一覧も更新
      if (!currentConsultation && newConsultationId) {
        router.push(`/ai-chat?id=${newConsultationId}`);
        fetchConsultations();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // 停止ボタンによるキャンセル
        setStreamingContent("");
        setSending(false);
        return;
      }
      console.error("Error sending message:", error);
      setMessages((prev) => prev.slice(0, -1));
      toast.error("送信に失敗しました");
    } finally {
      setSending(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const startNewChat = () => {
    router.push("/ai-chat");
    setShowSidebar(false);
  };

  const selectConsultation = (id: string) => {
    router.push(`/ai-chat?id=${id}`);
    setShowSidebar(false);
  };

  const deleteConsultation = async () => {
    if (!deleteTarget) return;

    // 削除対象のIDを保存してからダイアログを閉じる
    const targetId = deleteTarget.id;
    const targetTitle = deleteTarget.title;

    setDeleteTarget(null);
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/ai-chat/${targetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // リストから削除
        setConsultations((prev) => prev.filter((c) => c.id !== targetId));
        toast.success("相談を削除しました");

        // 現在表示中の相談を削除した場合は新規画面へ
        if (currentConsultation?.id === targetId) {
          router.push("/ai-chat");
        }
      } else {
        const data = await res.json();
        console.error("[AI Chat] Delete failed:", data);
        toast.error("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting consultation:", error);
      toast.error("削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // テキストエリアの自動リサイズ
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage, adjustTextareaHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter (Mac) or Ctrl+Enter (Windows) で送信
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onMenuClick={() => setShowSidebar(!showSidebar)} />

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー（モバイルではオーバーレイ） */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out
            md:relative md:translate-x-0
            ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          `}
          style={{ top: "56px" }}
        >
          <div className="p-4">
            <Button onClick={startNewChat} className="w-full mb-4">
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              新しい相談
            </Button>

            <div className="space-y-1">
              {consultations.map((c) => (
                <div
                  key={c.id}
                  className={`
                    group relative flex items-center rounded-lg transition-colors
                    ${
                      currentConsultation?.id === c.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }
                  `}
                >
                  <button
                    onClick={() => selectConsultation(c.id)}
                    className="flex-1 text-left px-3 py-2 text-sm truncate"
                  >
                    {c.title || "無題の相談"}
                  </button>

                  {/* Desktop: ホバーで×ボタン表示 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(c);
                    }}
                    className="hidden md:block opacity-0 group-hover:opacity-100 p-1 mr-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
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
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>

                  {/* Mobile: 常時⋮メニュー表示 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="md:hidden p-1 mr-1 rounded hover:bg-muted-foreground/10"
                      >
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
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(c)}
                        className="text-destructive focus:text-destructive"
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
                          className="mr-2"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {consultations.length === 0 && (
                <p className="text-sm text-muted-foreground px-3 py-2">
                  相談履歴がありません
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* オーバーレイ（モバイル） */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">読み込み中...</div>
            </div>
          ) : (
            <>
              {/* メッセージ一覧 */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">AIに相談する</h2>
                    <p className="text-muted-foreground max-w-md">
                      パートナーとの関係について相談できます。
                      過去の会話サマリーを参考に、あなたに合ったアドバイスを提供します。
                    </p>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`
                            max-w-[80%] rounded-lg px-4 py-2
                            ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.role === "user"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatDate(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {sending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                          {streamingContent ? (
                            <p className="whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">|</span></p>
                          ) : (
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                              <span
                                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              />
                              <span
                                className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* 入力欄 */}
              <div className="border-t p-4 bg-background">
                <div className="max-w-2xl mx-auto">
                  <div className="relative flex items-end gap-2 rounded-2xl border bg-muted/50 p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                    <Textarea
                      ref={textareaRef}
                      placeholder="メッセージを入力... (Cmd+Enterで送信)"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      rows={1}
                      className="flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-[200px] py-2 px-2"
                    />
                    <div className="flex gap-1 pb-1">
                      {sending ? (
                        <Button
                          onClick={stopGeneration}
                          variant="destructive"
                          size="sm"
                          className="h-9 w-9 p-0 rounded-xl"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="none"
                          >
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                          </svg>
                        </Button>
                      ) : (
                        <Button
                          onClick={sendMessage}
                          disabled={!inputMessage.trim()}
                          size="sm"
                          className="h-9 w-9 p-0 rounded-xl"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m22 2-7 20-4-9-9-4Z" />
                            <path d="M22 2 11 13" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Enterで改行 / Cmd+Enter (Ctrl+Enter) で送信
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>相談を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title || "無題の相談"}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteConsultation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ローディングオーバーレイ */}
      <LoadingOverlay open={isDeleting} message="削除中..." />
    </div>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-muted rounded-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">ダッシュボードへ</span>
          </Link>
        </div>
        <h1 className="text-lg font-semibold">AI相談</h1>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Aibond
        </Link>
      </div>
    </header>
  );
}
