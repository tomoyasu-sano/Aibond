"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface Talk {
  id: string;
  started_at: string;
  diarization_status: string;
  summary_status: string;
}

/**
 * グローバル通知コンポーネント
 * 話者識別完了時にどのページにいても通知を表示
 */
export function DiarizationNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const [notifiedTalkIds, setNotifiedTalkIds] = useState<Set<string>>(new Set());
  const previousTalksRef = useRef<Talk[]>([]);

  useEffect(() => {
    // 認証が必要なページでのみ動作
    if (pathname === "/" || pathname === "/login" || pathname === "/signup") {
      return;
    }

    const checkForCompletedDiarization = async () => {
      try {
        const res = await fetch("/api/talks");
        if (!res.ok) return;

        const data = await res.json();
        const talks: Talk[] = data.talks || [];

        // 話者識別確認待ちの会話を検出
        const waitingTalks = talks.filter(
          (talk) =>
            talk.summary_status === "waiting_confirmation" &&
            !notifiedTalkIds.has(talk.id)
        );

        // 新しく確認待ちになった会話があれば通知
        for (const talk of waitingTalks) {
          const prevTalk = previousTalksRef.current.find((t) => t.id === talk.id);

          // 前回は確認待ちでなかった場合のみ通知
          if (!prevTalk || prevTalk.summary_status !== "waiting_confirmation") {
            showNotification(talk);
            setNotifiedTalkIds((prev) => new Set([...prev, talk.id]));
          }
        }

        previousTalksRef.current = talks;
      } catch (error) {
        // エラーは無視（バックグラウンド処理なので）
      }
    };

    // 初回チェック
    checkForCompletedDiarization();

    // 5秒ごとにポーリング
    const interval = setInterval(checkForCompletedDiarization, 5000);

    return () => clearInterval(interval);
  }, [pathname, notifiedTalkIds]);

  const showNotification = (talk: Talk) => {
    const talkDate = new Date(talk.started_at).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    toast.success(`話者識別が完了しました`, {
      description: `${talkDate} の会話の話者識別が完了しました。確認してください。`,
      duration: 10000, // 10秒間表示
      action: {
        label: "確認する",
        onClick: () => {
          router.push(`/talks/${talk.id}`);
        },
      },
    });
  };

  // このコンポーネントはUIを持たない
  return null;
}
