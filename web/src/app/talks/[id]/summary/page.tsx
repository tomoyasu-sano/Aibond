"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeakerMappingDialog } from "@/components/talk/SpeakerMappingDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Talk {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: string;
  summary: string | null;
  summary_status: string;
  promises: Array<{ content: string; speaker: number }> | null;
  next_topics: string[] | null;
  speaker1_name: string | null;
  speaker2_name: string | null;
  speaker1_user_id: string | null;
  speaker2_user_id: string | null;
  partnership_id: string | null;
  pending_bond_notes: any[] | null;
  pending_manual_items: any[] | null;
  owner_user_id: string;
}

export default function SummaryPage() {
  const router = useRouter();
  const params = useParams();
  const talkId = params.id as string;
  const t = useTranslations("summary");
  const tt = useTranslations("talks");
  const tc = useTranslations("common");

  const [talk, setTalk] = useState<Talk | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [hasShownMapping, setHasShownMapping] = useState(false);
  const [bondNoteItems, setBondNoteItems] = useState<any[]>([]);
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  const [showBondNoteDialog, setShowBondNoteDialog] = useState(false);
  const [isSavingBondNotes, setIsSavingBondNotes] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [hasProcessedPendingBondNotes, setHasProcessedPendingBondNotes] = useState(false);

  // 取説関連のstate
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [isSavingManualItems, setIsSavingManualItems] = useState(false);
  const [hasProcessedPendingManualItems, setHasProcessedPendingManualItems] = useState(false);

  useEffect(() => {
    fetchTalk();
  }, [talkId]);

  // サマリー生成完了後に話者マッピングダイアログを表示
  useEffect(() => {
    if (
      talk?.summary_status === "generated" &&
      !hasShownMapping &&
      !talk.speaker1_user_id &&
      !talk.speaker2_user_id
    ) {
      setShowSpeakerMapping(true);
      setHasShownMapping(true);
    }
  }, [talk?.summary_status, hasShownMapping, talk?.speaker1_user_id, talk?.speaker2_user_id]);

  // pending_bond_notes がある場合、初回ロード時に絆ノートダイアログを表示
  useEffect(() => {
    if (
      talk?.summary_status === "generated" &&
      talk.pending_bond_notes &&
      talk.pending_bond_notes.length > 0 &&
      talk.partnership_id &&
      !hasProcessedPendingBondNotes
    ) {
      setBondNoteItems(talk.pending_bond_notes);
      setPartnershipId(talk.partnership_id);
      setShowBondNoteDialog(true);
      setHasProcessedPendingBondNotes(true);
    }
  }, [talk?.summary_status, talk?.pending_bond_notes, talk?.partnership_id, hasProcessedPendingBondNotes]);

  // pending_manual_items がある場合、取説ダイアログを表示
  // 絆ノートダイアログがある場合はそちらを先に処理してから表示
  useEffect(() => {
    if (
      talk?.summary_status === "generated" &&
      talk.pending_manual_items &&
      talk.pending_manual_items.length > 0 &&
      !hasProcessedPendingManualItems &&
      !showBondNoteDialog // 絆ノートダイアログが閉じられた後に表示
    ) {
      // 絆ノートがある場合は、先に絆ノートを処理してからでないと表示しない
      const hasPendingBondNotes = talk.pending_bond_notes && talk.pending_bond_notes.length > 0 && talk.partnership_id;
      if (hasPendingBondNotes && !hasProcessedPendingBondNotes) {
        // 絆ノートがまだ処理されていない場合は待機
        return;
      }
      setManualItems(talk.pending_manual_items);
      setShowManualDialog(true);
      setHasProcessedPendingManualItems(true);
    }
  }, [talk?.summary_status, talk?.pending_manual_items, talk?.pending_bond_notes, talk?.partnership_id, hasProcessedPendingManualItems, hasProcessedPendingBondNotes, showBondNoteDialog]);

  useEffect(() => {
    // サマリー生成中の場合、ポーリングで更新を監視
    if (talk?.summary_status === "pending" || talk?.summary_status === "generating") {
      const interval = setInterval(fetchTalk, 3000);
      return () => clearInterval(interval);
    }
  }, [talk?.summary_status]);

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
    } catch (error) {
      console.error("Error fetching talk:", error);
      toast.error(t("generationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const regenerateSummary = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talkId }),
      });

      if (res.ok) {
        const data = await res.json();
        setTalk((prev) =>
          prev
            ? {
                ...prev,
                summary: data.summary,
                promises: data.promises,
                next_topics: data.nextTopics,
                summary_status: "generated",
              }
            : null
        );

        // 絆ノート項目があればダイアログを表示（0件の場合は表示しない）
        if (data.bondNoteItems && data.bondNoteItems.length > 0 && data.partnershipId) {
          setBondNoteItems(data.bondNoteItems);
          setPartnershipId(data.partnershipId);
          setShowBondNoteDialog(true);
        }

        // 取説項目があればセット（絆ノートダイアログが閉じた後に表示される）
        if (data.manualItems && data.manualItems.length > 0) {
          setManualItems(data.manualItems);
          // 絆ノートダイアログがない場合は直接表示
          if (!data.bondNoteItems || data.bondNoteItems.length === 0 || !data.partnershipId) {
            setShowManualDialog(true);
          }
        }

        toast.success(t("generatingMessage"));
      } else {
        toast.error(t("generationFailed"));
      }
    } catch (error) {
      console.error("Error regenerating summary:", error);
      toast.error(t("generationFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  // pending_bond_notes をクリアする
  const clearPendingBondNotes = async () => {
    try {
      await fetch(`/api/talks/${talkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_bond_notes: null }),
      });
    } catch (error) {
      console.error("Error clearing pending bond notes:", error);
    }
  };

  const saveBondNotesToKizuna = async () => {
    if (!partnershipId || bondNoteItems.length === 0) return;

    setIsSavingBondNotes(true);
    try {
      const res = await fetch("/api/kizuna/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnershipId,
          talkId,
          items: bondNoteItems,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `絆ノートに追加しました（テーマ: ${data.createdTopics}件、項目: ${data.createdItems}件）`
        );
        setShowBondNoteDialog(false);
        setBondNoteItems([]);
        // pending_bond_notes をクリア
        await clearPendingBondNotes();
      } else {
        toast.error("絆ノートへの追加に失敗しました");
      }
    } catch (error) {
      console.error("Error saving bond notes:", error);
      toast.error("絆ノートへの追加に失敗しました");
    } finally {
      setIsSavingBondNotes(false);
    }
  };

  // ダイアログをキャンセルした時も pending_bond_notes をクリア
  const handleBondNoteDialogClose = async (open: boolean) => {
    setShowBondNoteDialog(open);
    if (!open && hasProcessedPendingBondNotes) {
      // ダイアログを閉じた場合、pending_bond_notes をクリア
      await clearPendingBondNotes();
    }
  };

  // pending_manual_items をクリアする
  const clearPendingManualItems = async () => {
    try {
      await fetch(`/api/talks/${talkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_manual_items: null }),
      });
    } catch (error) {
      console.error("Error clearing pending manual items:", error);
    }
  };

  // 取説項目を保存
  const saveManualItems = async () => {
    if (!talk || manualItems.length === 0) return;

    setIsSavingManualItems(true);
    try {
      // 話者ごとに分けて保存
      const speaker1Items = manualItems.filter((item) => item.speakerTag === 1);
      const speaker2Items = manualItems.filter((item) => item.speakerTag === 2);

      let savedCount = 0;

      // 話者1の取説（自分）
      if (speaker1Items.length > 0 && talk.speaker1_user_id) {
        const res = await fetch("/api/manual/items/bulk-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_user_id: talk.speaker1_user_id,
            items: speaker1Items.map((item) => ({
              category: item.category,
              question: item.question,
              answer: item.answer,
              date: item.date,
            })),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          savedCount += data.count || 0;
        }
      }

      // 話者2の取説（パートナー）
      if (speaker2Items.length > 0 && talk.speaker2_user_id) {
        const res = await fetch("/api/manual/items/bulk-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_user_id: talk.speaker2_user_id,
            items: speaker2Items.map((item) => ({
              category: item.category,
              question: item.question,
              answer: item.answer,
              date: item.date,
            })),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          savedCount += data.count || 0;
        }
      }

      if (savedCount > 0) {
        toast.success(`取説に${savedCount}件追加しました`);
      } else {
        toast.info("保存できる項目がありませんでした（話者が設定されていません）");
      }

      setShowManualDialog(false);
      setManualItems([]);
      await clearPendingManualItems();
    } catch (error) {
      console.error("Error saving manual items:", error);
      toast.error("取説への追加に失敗しました");
    } finally {
      setIsSavingManualItems(false);
    }
  };

  // 取説ダイアログを閉じた時の処理
  const handleManualDialogClose = async (open: boolean) => {
    setShowManualDialog(open);
    if (!open && hasProcessedPendingManualItems) {
      await clearPendingManualItems();
    }
  };

  // 取説項目を削除
  const deleteManualItem = (index: number) => {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  };

  // カテゴリーラベル
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

  const updateBondNoteItem = (index: number, field: string, value: any) => {
    setBondNoteItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const deleteBondNoteItem = (index: number) => {
    setBondNoteItems((prev) => prev.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSpeakerName = (speakerTag: number) => {
    if (speakerTag === 1) {
      return talk?.speaker1_name || "話者1";
    }
    return talk?.speaker2_name || "話者2";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header t={t} tt={tt} tc={tc} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!talk) {
    return null;
  }

  // サマリー生成中の場合、全画面ローディング表示
  if (talk.summary_status === "pending" || talk.summary_status === "generating") {
    return (
      <div className="min-h-screen bg-background">
        <Header t={t} tt={tt} tc={tc} />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-xl font-semibold mb-2">サマリーを作成中...</h2>
            <p className="text-muted-foreground text-center">
              会話内容を分析してサマリーを生成しています。<br />
              しばらくお待ちください。
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header t={t} tt={tt} tc={tc} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 基本情報 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">
            {formatDate(talk.started_at)}
            {talk.duration_minutes && ` (${talk.duration_minutes}${tc("minute")})`}
          </p>
        </div>

        {/* サマリー */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
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
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <line x1="10" x2="8" y1="9" y2="9" />
                </svg>
                {t("summary")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {talk.summary_status === "pending" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                {t("generatingMessage")}
              </div>
            ) : talk.summary_status === "failed" ? (
              <div className="space-y-3">
                <p className="text-destructive">
                  {t("generationFailed")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateSummary}
                  disabled={isGenerating}
                >
                  {isGenerating ? t("regenerating") : t("retry")}
                </Button>
              </div>
            ) : talk.summary ? (
              <p className="whitespace-pre-wrap">{talk.summary}</p>
            ) : (
              <p className="text-muted-foreground">{t("noContent")}</p>
            )}
          </CardContent>
        </Card>

        {/* 次回話すこと */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {t("nextTopics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {talk.next_topics && talk.next_topics.length > 0 ? (
              <ul className="space-y-2">
                {talk.next_topics.map((topic, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-muted-foreground">-</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {talk.summary_status === "pending"
                  ? t("generatingMessage")
                  : t("noNextTopics")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/talks/${talkId}`}>{t("viewConversation")}</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/talks">{t("backToList")}</Link>
          </Button>
        </div>

        {/* 話者設定ボタン */}
        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => setShowSpeakerMapping(true)}
            className="text-sm text-muted-foreground"
          >
            {t("setSpeaker")}
          </Button>
        </div>
      </main>

      {/* 話者マッピングダイアログ */}
      <SpeakerMappingDialog
        open={showSpeakerMapping}
        onOpenChange={setShowSpeakerMapping}
        talkId={talkId}
        onMappingComplete={fetchTalk}
      />

      {/* 絆ノート追加確認ダイアログ */}
      <Dialog open={showBondNoteDialog} onOpenChange={handleBondNoteDialogClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>絆ノートに追加しますか？</DialogTitle>
            <DialogDescription>
              会話から以下の項目を抽出しました。編集・削除してから追加することができます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {bondNoteItems.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  {editingItemIndex === index ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">テーマ</label>
                        <Input
                          value={item.topicTitle || ""}
                          onChange={(e) =>
                            updateBondNoteItem(index, "topicTitle", e.target.value)
                          }
                          placeholder="テーマ名を入力"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">種類</label>
                          <Select
                            value={item.type}
                            onValueChange={(value) =>
                              updateBondNoteItem(index, "type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="promise">約束</SelectItem>
                              <SelectItem value="request">要望</SelectItem>
                              <SelectItem value="discussion">検討</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">担当</label>
                          <Select
                            value={item.assignee}
                            onValueChange={(value) =>
                              updateBondNoteItem(index, "assignee", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="self">自分</SelectItem>
                              <SelectItem value="partner">パートナー</SelectItem>
                              <SelectItem value="both">二人</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">見直し日</label>
                        <Input
                          type="date"
                          value={item.reviewDate || ""}
                          onChange={(e) =>
                            updateBondNoteItem(index, "reviewDate", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">内容</label>
                        <Textarea
                          value={item.content}
                          onChange={(e) =>
                            updateBondNoteItem(index, "content", e.target.value)
                          }
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">気持ち（任意）</label>
                        <Textarea
                          value={item.feeling || ""}
                          onChange={(e) =>
                            updateBondNoteItem(index, "feeling", e.target.value)
                          }
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">相手の気持ち（任意）</label>
                        <Textarea
                          value={item.partnerFeeling || ""}
                          onChange={(e) =>
                            updateBondNoteItem(index, "partnerFeeling", e.target.value)
                          }
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">メモ（任意）</label>
                        <Textarea
                          value={item.memo || ""}
                          onChange={(e) =>
                            updateBondNoteItem(index, "memo", e.target.value)
                          }
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingItemIndex(null)}
                        >
                          完了
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBondNoteItem(index)}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            📁 {item.topicTitle || "既存テーマ"}
                          </span>
                          {item.topicTitle && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              新規
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItemIndex(index)}
                          >
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBondNoteItem(index)}
                          >
                            削除
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            item.type === "promise"
                              ? "bg-blue-100 text-blue-700"
                              : item.type === "request"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {item.type === "promise"
                            ? "約束"
                            : item.type === "request"
                            ? "要望"
                            : "検討"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          担当: {item.assignee === "self" ? "自分" : item.assignee === "partner" ? "パートナー" : "二人"}
                        </span>
                        {item.reviewDate && (
                          <span className="text-xs text-muted-foreground">
                            見直し: {item.reviewDate}
                          </span>
                        )}
                      </div>

                      <p className="text-sm">{item.content}</p>

                      {(item.feeling || item.partnerFeeling || item.memo) && (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {item.feeling && (
                            <p>💭 気持ち: {item.feeling}</p>
                          )}
                          {item.partnerFeeling && (
                            <p>💕 相手の気持ち: {item.partnerFeeling}</p>
                          )}
                          {item.memo && (
                            <p>📝 メモ: {item.memo}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBondNoteDialog(false)}
              disabled={isSavingBondNotes}
            >
              キャンセル
            </Button>
            <Button
              onClick={saveBondNotesToKizuna}
              disabled={isSavingBondNotes || bondNoteItems.length === 0}
            >
              {isSavingBondNotes ? "追加中..." : `絆ノートに追加 (${bondNoteItems.length}件)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 取説追加確認ダイアログ */}
      <Dialog open={showManualDialog} onOpenChange={handleManualDialogClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>取説に追加しますか？</DialogTitle>
            <DialogDescription>
              会話から以下の個人情報を抽出しました。取説に追加できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {manualItems.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary">
                          {getCategoryLabel(item.category)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          item.speakerTag === 1
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700"
                        }`}>
                          {item.speakerTag === 1
                            ? (talk?.speaker1_name || "話者1")
                            : (talk?.speaker2_name || "話者2")}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteManualItem(index)}
                      >
                        削除
                      </Button>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.question}</p>
                      <p className="text-sm text-muted-foreground">{item.answer}</p>
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

            {manualItems.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                追加する項目がありません
              </p>
            )}

            {/* パートナー未連携時のプロモーション */}
            {!talk?.speaker2_user_id && manualItems.some(item => item.speakerTag === 2) && (
              <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-purple-500/10 p-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      パートナーと連携しませんか？
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      連携すると、相手の取説も追加できるようになります
                    </p>
                    <Link href="/partners" className="inline-block mt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-background/50 hover:bg-background">
                        連携する
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                          <path d="m9 18 6-6-6-6"/>
                        </svg>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleManualDialogClose(false)}
              disabled={isSavingManualItems}
            >
              キャンセル
            </Button>
            <Button
              onClick={saveManualItems}
              disabled={isSavingManualItems || manualItems.length === 0}
            >
              {isSavingManualItems ? "追加中..." : `取説に追加 (${manualItems.length}件)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({ t, tt, tc }: { t: ReturnType<typeof useTranslations>; tt: ReturnType<typeof useTranslations>; tc: ReturnType<typeof useTranslations> }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/talks" className="flex items-center gap-2">
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
          <span>{tt("backToList")}</span>
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          {tc("appName")}
        </Link>
      </div>
    </header>
  );
}
