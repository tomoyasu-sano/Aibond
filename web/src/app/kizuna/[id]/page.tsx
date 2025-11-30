"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { RatingIcon, RatingButton } from "@/components/kizuna/RatingIcon";
import {
  ItemTypeIcon,
  ReviewResultIcon,
  TopicStatusIcon,
  ReviewDueIcon,
  CelebrateIcon,
  ReopenIcon,
  ReviewIcon,
  EmptyStateIcon,
} from "@/components/kizuna/KizunaIcons";

interface Topic {
  id: string;
  title: string;
  status: "active" | "resolved";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface Feedback {
  id: string;
  user_id: string;
  rating: "good" | "neutral" | "bad";
  comment: string | null;
  created_at: string;
}

interface Review {
  id: string;
  result: "completed" | "continue" | "modified" | "abandoned";
  note: string | null;
  created_at: string;
}

interface Item {
  id: string;
  topic_id: string;
  type: "promise" | "request" | "my_feeling" | "partner_feeling" | "memo";
  content: string;
  assignee: "self" | "partner" | "both" | null;
  review_date: string | null;
  review_period: string | null;
  status: "active" | "completed" | "modified" | "abandoned";
  created_by: string;
  created_at: string;
  feedbacks: Feedback[];
  reviews?: Review[];
}

const typeConfig = {
  promise: { label: "約束", color: "bg-blue-100 text-blue-700" },
  request: { label: "要望", color: "bg-purple-100 text-purple-700" },
  my_feeling: { label: "自分の気持ち", color: "bg-green-100 text-green-700" },
  partner_feeling: { label: "相手の気持ち", color: "bg-pink-100 text-pink-700" },
  memo: { label: "メモ", color: "bg-gray-100 text-gray-700" },
};

const assigneeLabel = {
  self: "自分",
  partner: "パートナー",
  both: "両方",
};


const reviewPeriodLabel = {
  "1week": "1週間",
  "2weeks": "2週間",
  "1month": "1ヶ月",
  "3months": "3ヶ月",
};

const statusConfig = {
  active: { label: "継続中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "達成", color: "bg-green-100 text-green-700" },
  modified: { label: "修正済", color: "bg-yellow-100 text-yellow-700" },
  abandoned: { label: "断念", color: "bg-gray-100 text-gray-500" },
};

export default function KizunaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // ダイアログ状態
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [feedbackTargetItem, setFeedbackTargetItem] = useState<Item | null>(null);
  const [reviewTargetItem, setReviewTargetItem] = useState<Item | null>(null);

  // フォーム状態
  const [newItemType, setNewItemType] = useState<string>("promise");
  const [newItemContent, setNewItemContent] = useState("");
  const [newItemAssignee, setNewItemAssignee] = useState("self");
  const [newItemReviewPeriod, setNewItemReviewPeriod] = useState("1month");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フィードバックフォーム
  const [feedbackRating, setFeedbackRating] = useState<string>("");
  const [feedbackComment, setFeedbackComment] = useState("");

  // レビューフォーム
  const [reviewResult, setReviewResult] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewNewContent, setReviewNewContent] = useState("");
  const [reviewNewPeriod, setReviewNewPeriod] = useState("1month");

  useEffect(() => {
    fetchTopic();
  }, [id]);

  const fetchTopic = async () => {
    try {
      const res = await fetch(`/api/kizuna/topics/${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        router.push("/kizuna");
        return;
      }

      const data = await res.json();
      setTopic(data.topic);
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching topic:", error);
      toast.error("テーマの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItemContent.trim()) return;

    setIsSubmitting(true);
    try {
      // 約束の場合、レビュー日を計算
      let reviewDate = null;
      if (newItemType === "promise") {
        const date = new Date();
        switch (newItemReviewPeriod) {
          case "1week":
            date.setDate(date.getDate() + 7);
            break;
          case "2weeks":
            date.setDate(date.getDate() + 14);
            break;
          case "1month":
            date.setMonth(date.getMonth() + 1);
            break;
          case "3months":
            date.setMonth(date.getMonth() + 3);
            break;
        }
        reviewDate = date.toISOString().split("T")[0];
      }

      const res = await fetch("/api/kizuna/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: id,
          type: newItemType,
          content: newItemContent.trim(),
          assignee: ["promise", "request"].includes(newItemType)
            ? newItemAssignee
            : null,
          review_date: reviewDate,
          review_period: newItemType === "promise" ? newItemReviewPeriod : null,
        }),
      });

      if (res.ok) {
        toast.success("追加しました");
        setIsAddDialogOpen(false);
        setNewItemContent("");
        setNewItemType("promise");
        setNewItemAssignee("self");
        setNewItemReviewPeriod("1month");
        fetchTopic();
      } else {
        const error = await res.json();
        toast.error(error.error || "追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addFeedback = async () => {
    if (!feedbackTargetItem || !feedbackRating) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kizuna/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: feedbackTargetItem.id,
          rating: feedbackRating,
          comment: feedbackComment.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("評価を追加しました");
        setIsFeedbackDialogOpen(false);
        setFeedbackTargetItem(null);
        setFeedbackRating("");
        setFeedbackComment("");
        fetchTopic();
      } else {
        const error = await res.json();
        toast.error(error.error || "評価の追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding feedback:", error);
      toast.error("評価の追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReview = async () => {
    if (!reviewTargetItem || !reviewResult) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kizuna/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: reviewTargetItem.id,
          result: reviewResult,
          note: reviewNote.trim() || null,
          new_content: reviewResult === "modified" ? reviewNewContent.trim() : null,
          new_review_period: ["continue", "modified"].includes(reviewResult)
            ? reviewNewPeriod
            : null,
        }),
      });

      if (res.ok) {
        const resultLabels = {
          completed: "達成おめでとうございます！",
          continue: "継続します",
          modified: "修正して継続します",
          abandoned: "お疲れ様でした",
        };
        toast.success(resultLabels[reviewResult as keyof typeof resultLabels] || "レビューを保存しました");
        setIsReviewDialogOpen(false);
        setReviewTargetItem(null);
        setReviewResult("");
        setReviewNote("");
        setReviewNewContent("");
        setReviewNewPeriod("1month");
        fetchTopic();
      } else {
        const error = await res.json();
        toast.error(error.error || "レビューの保存に失敗しました");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("レビューの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveTopic = async () => {
    try {
      const res = await fetch(`/api/kizuna/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });

      if (res.ok) {
        toast.success("テーマを解決済みにしました");
        setIsResolveDialogOpen(false);
        fetchTopic();
      } else {
        toast.error("更新に失敗しました");
      }
    } catch (error) {
      console.error("Error resolving topic:", error);
      toast.error("更新に失敗しました");
    }
  };

  const reopenTopic = async () => {
    try {
      const res = await fetch(`/api/kizuna/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (res.ok) {
        toast.success("テーマを再開しました");
        fetchTopic();
      } else {
        toast.error("更新に失敗しました");
      }
    } catch (error) {
      console.error("Error reopening topic:", error);
      toast.error("更新に失敗しました");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // レビュー待ちの項目数
  const reviewDueCount = items.filter((item) => {
    if (item.status !== "active" || !item.review_date) return false;
    return new Date(item.review_date) <= new Date();
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!topic) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header reviewDueCount={reviewDueCount} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* テーマヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <TopicStatusIcon status={topic.status} size={28} />
            <h1 className="text-2xl font-bold">{topic.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>開始: {formatDate(topic.created_at)}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                topic.status === "resolved"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {topic.status === "resolved" ? "解決済み" : "継続中"}
            </span>
          </div>
        </div>

        {/* レビュー待ちバナー */}
        {reviewDueCount > 0 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
            <ReviewDueIcon size={20} />
            <p className="text-sm text-orange-800">
              {reviewDueCount}件の約束がレビュー時期です
            </p>
          </div>
        )}

        {/* タイムライン */}
        <div className="space-y-6 mb-8">
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="flex justify-center mb-4">
                  <EmptyStateIcon size={48} />
                </div>
                <p className="text-muted-foreground mb-2">まだ項目がありません</p>
                <p className="text-sm text-muted-foreground">
                  約束や気持ちを追加して、記録を始めましょう
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 約束・要望（メイン） */}
              {items.filter(i => ["promise", "request"].includes(i.type)).length > 0 && (
                <div className="space-y-4">
                  {items
                    .filter(i => ["promise", "request"].includes(i.type))
                    .map((item) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        onFeedbackClick={() => {
                          setFeedbackTargetItem(item);
                          setIsFeedbackDialogOpen(true);
                        }}
                        onReviewClick={() => {
                          setReviewTargetItem(item);
                          setReviewNewContent(item.content);
                          setReviewNewPeriod(item.review_period || "1month");
                          setIsReviewDialogOpen(true);
                        }}
                      />
                    ))}
                </div>
              )}

              {/* 気持ち・メモ（サブ） */}
              {items.filter(i => ["my_feeling", "partner_feeling", "memo"].includes(i.type)).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">気持ち・メモ</p>
                  <div className="space-y-1">
                    {items
                      .filter(i => ["my_feeling", "partner_feeling", "memo"].includes(i.type))
                      .map((item) => (
                        <CompactItem key={item.id} item={item} />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setIsAddDialogOpen(true)}>+ 追加</Button>
            {topic.status === "active" ? (
              <Button
                variant="outline"
                onClick={() => setIsResolveDialogOpen(true)}
                className="gap-2"
              >
                <CelebrateIcon size={16} />
                解決済みにする
              </Button>
            ) : (
              <Button variant="outline" onClick={reopenTopic} className="gap-2">
                <ReopenIcon size={16} />
                再開する
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* 項目追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しい項目を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">種類</label>
              <Select value={newItemType} onValueChange={setNewItemType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promise">
                    <span className="flex items-center gap-2">
                      <ItemTypeIcon type="promise" size={16} />
                      約束
                    </span>
                  </SelectItem>
                  <SelectItem value="request">
                    <span className="flex items-center gap-2">
                      <ItemTypeIcon type="request" size={16} />
                      要望
                    </span>
                  </SelectItem>
                  <SelectItem value="my_feeling">
                    <span className="flex items-center gap-2">
                      <ItemTypeIcon type="my_feeling" size={16} />
                      自分の気持ち
                    </span>
                  </SelectItem>
                  <SelectItem value="partner_feeling">
                    <span className="flex items-center gap-2">
                      <ItemTypeIcon type="partner_feeling" size={16} />
                      相手の気持ち
                    </span>
                  </SelectItem>
                  <SelectItem value="memo">
                    <span className="flex items-center gap-2">
                      <ItemTypeIcon type="memo" size={16} />
                      話し合いメモ
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["promise", "request"].includes(newItemType) && (
              <div>
                <label className="text-sm font-medium">担当</label>
                <Select value={newItemAssignee} onValueChange={setNewItemAssignee}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">自分</SelectItem>
                    <SelectItem value="partner">パートナー</SelectItem>
                    <SelectItem value="both">両方</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {newItemType === "promise" && (
              <div>
                <label className="text-sm font-medium">見直し時期</label>
                <Select value={newItemReviewPeriod} onValueChange={setNewItemReviewPeriod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">1週間後</SelectItem>
                    <SelectItem value="2weeks">2週間後</SelectItem>
                    <SelectItem value="1month">1ヶ月後</SelectItem>
                    <SelectItem value="3months">3ヶ月後</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  この期間が過ぎたらレビューして、継続/修正/達成を決めます
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">内容</label>
              <Textarea
                className="mt-1"
                placeholder={
                  newItemType === "promise"
                    ? "例: イライラしたら一旦部屋を離れる"
                    : newItemType === "request"
                    ? "例: もっと話を聞いてほしい"
                    : newItemType === "my_feeling"
                    ? "例: 感情的になると抑えられない..."
                    : newItemType === "partner_feeling"
                    ? "例: 大声を出されると怖くなる..."
                    : "例: 話し合いで決まったこと..."
                }
                value={newItemContent}
                onChange={(e) => setNewItemContent(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={addItem}
              disabled={isSubmitting || !newItemContent.trim()}
            >
              {isSubmitting ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 評価ダイアログ */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>評価を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {feedbackTargetItem && (
              <div className="p-3 bg-muted rounded">
                <p className="text-sm">{feedbackTargetItem.content}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">どうだった？</label>
              <div className="flex gap-2 mt-2 justify-center">
                {(["good", "neutral", "bad"] as const).map((rating) => (
                  <RatingButton
                    key={rating}
                    rating={rating}
                    selected={feedbackRating === rating}
                    onClick={() => setFeedbackRating(rating)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">コメント（任意）</label>
              <Textarea
                className="mt-1"
                placeholder="一言あれば..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFeedbackDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={addFeedback}
              disabled={isSubmitting || !feedbackRating}
            >
              {isSubmitting ? "送信中..." : "送信"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* レビューダイアログ */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReviewIcon size={20} />
              レビュー
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewTargetItem && (
              <>
                <div className="p-3 bg-muted rounded">
                  <p className="text-sm font-medium mb-1">約束の内容</p>
                  <p className="text-sm">{reviewTargetItem.content}</p>
                </div>

                {reviewTargetItem.feedbacks && reviewTargetItem.feedbacks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">評価の推移</p>
                    <div className="flex gap-1">
                      {reviewTargetItem.feedbacks.map((fb) => (
                        <span key={fb.id} title={fb.comment || undefined}>
                          <RatingIcon rating={fb.rating} size="sm" />
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-sm font-medium">この約束をどうしますか？</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { value: "completed", label: "達成！", desc: "習慣になった" },
                  { value: "continue", label: "継続", desc: "このまま続ける" },
                  { value: "modified", label: "修正", desc: "内容を変える" },
                  { value: "abandoned", label: "断念", desc: "話し合って終了" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`p-3 rounded-lg border text-left transition-all ${
                      reviewResult === option.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => setReviewResult(option.value)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ReviewResultIcon result={option.value} size={18} />
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {reviewResult === "modified" && (
              <div>
                <label className="text-sm font-medium">新しい内容</label>
                <Textarea
                  className="mt-1"
                  value={reviewNewContent}
                  onChange={(e) => setReviewNewContent(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {["continue", "modified"].includes(reviewResult) && (
              <div>
                <label className="text-sm font-medium">次の見直し時期</label>
                <Select value={reviewNewPeriod} onValueChange={setReviewNewPeriod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">1週間後</SelectItem>
                    <SelectItem value="2weeks">2週間後</SelectItem>
                    <SelectItem value="1month">1ヶ月後</SelectItem>
                    <SelectItem value="3months">3ヶ月後</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">メモ（任意）</label>
              <Textarea
                className="mt-1"
                placeholder="振り返りのメモがあれば..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={submitReview}
              disabled={isSubmitting || !reviewResult}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解決確認ダイアログ */}
      <AlertDialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テーマを解決済みにしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このテーマを解決済みにします。後から再開することもできます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={resolveTopic}>
              解決済みにする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TimelineItem({
  item,
  onFeedbackClick,
  onReviewClick,
}: {
  item: Item;
  onFeedbackClick: () => void;
  onReviewClick: () => void;
}) {
  const config = typeConfig[item.type];
  const isReviewDue =
    item.status === "active" &&
    item.review_date &&
    new Date(item.review_date) <= new Date();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const isInactive = ["completed", "modified", "abandoned"].includes(item.status);

  return (
    <Card className={isInactive ? "opacity-60" : ""}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <ItemTypeIcon type={item.type} size={24} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>
                {config.label}
              </span>
              {item.assignee && (
                <span className="text-xs text-muted-foreground">
                  担当: {assigneeLabel[item.assignee]}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTime(item.created_at)}
              </span>
              {item.status !== "active" && (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted">
                  <ReviewResultIcon result={item.status} size={12} />
                  {statusConfig[item.status].label}
                </span>
              )}
              {isReviewDue && (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                  <ReviewDueIcon size={12} />
                  レビュー
                </span>
              )}
            </div>

            <p className={`text-sm ${isInactive ? "line-through" : ""}`}>
              {item.content}
            </p>

            {/* レビュー日 */}
            {item.review_date && item.status === "active" && (
              <p className="text-xs text-muted-foreground mt-1">
                次回レビュー: {formatTime(item.review_date)}
                {item.review_period && ` (${reviewPeriodLabel[item.review_period as keyof typeof reviewPeriodLabel]})`}
              </p>
            )}

            {/* 評価履歴 */}
            {item.feedbacks && item.feedbacks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.feedbacks.map((fb) => (
                  <span key={fb.id} title={fb.comment || undefined}>
                    <RatingIcon rating={fb.rating} size="sm" />
                  </span>
                ))}
              </div>
            )}

            {/* アクションボタン */}
            {item.status === "active" && (
              <div className="mt-2 flex gap-2">
                {["promise", "request"].includes(item.type) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={onFeedbackClick}
                  >
                    + 評価
                  </Button>
                )}
                {item.type === "promise" && item.review_date && (
                  <Button
                    variant={isReviewDue ? "default" : "ghost"}
                    size="sm"
                    className="text-xs gap-1"
                    onClick={onReviewClick}
                  >
                    <ReviewIcon size={14} />
                    レビュー
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 気持ち・メモ用のコンパクト表示
function CompactItem({ item }: { item: Item }) {
  const config = typeConfig[item.type];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <ItemTypeIcon type={item.type} size={18} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 leading-relaxed">{item.content}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-1 py-0.5 rounded ${config.color}`}>
            {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Header({ reviewDueCount = 0 }: { reviewDueCount?: number }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/kizuna" className="flex items-center gap-2">
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
          <span>絆ノート</span>
          {reviewDueCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
              {reviewDueCount}
            </span>
          )}
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Aibond
        </Link>
      </div>
    </header>
  );
}
