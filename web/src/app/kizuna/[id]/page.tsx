"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  HistoryIcon,
} from "@/components/kizuna/KizunaIcons";

interface Topic {
  id: string;
  title: string;
  status: "active" | "resolved";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface TopicListItem {
  id: string;
  title: string;
  status: "active" | "resolved";
  item_count: number;
  review_due_count: number;
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
  type: "promise" | "request" | "discussion" | "my_feeling" | "partner_feeling" | "memo";
  content: string;
  assignee: "self" | "partner" | "both" | null;
  review_date: string | null;
  review_period: string | null;
  status: "active" | "completed" | "modified" | "abandoned";
  created_by: string;
  created_at: string;
  parent_item_id: string | null;
  feedbacks: Feedback[];
  reviews?: Review[];
}

interface ParentItemWithChildren extends Item {
  children: Item[];
}

const typeConfig = {
  promise: { label: "約束", color: "bg-blue-100 text-blue-700" },
  request: { label: "要望", color: "bg-purple-100 text-purple-700" },
  discussion: { label: "検討", color: "bg-orange-100 text-orange-700" },
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
  abandoned: { label: "終了", color: "bg-gray-100 text-gray-500" },
};

export default function KizunaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("kizunaDetail");
  const tc = useTranslations("common");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [parentItems, setParentItems] = useState<ParentItemWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTopics, setAllTopics] = useState<TopicListItem[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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
  const [newItemParentId, setNewItemParentId] = useState<string>("");
  const [isAddingChildMode, setIsAddingChildMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フィードバックフォーム
  const [feedbackRating, setFeedbackRating] = useState<string>("");
  const [feedbackComment, setFeedbackComment] = useState("");

  // レビューフォーム
  const [reviewResult, setReviewResult] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewNewContent, setReviewNewContent] = useState("");
  const [reviewNewPeriod, setReviewNewPeriod] = useState("1month");

  // 新規テーマ作成
  const [isNewTopicDialogOpen, setIsNewTopicDialogOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  useEffect(() => {
    fetchTopic();
    fetchAllTopics();
  }, [id]);

  const fetchAllTopics = async () => {
    try {
      const res = await fetch("/api/kizuna/topics");
      if (res.ok) {
        const data = await res.json();
        setAllTopics(data.topics || []);
      }
    } catch (error) {
      console.error("Error fetching all topics:", error);
    }
  };

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
      setParentItems(data.parentItems || []);
    } catch (error) {
      console.error("Error fetching topic:", error);
      toast.error(t("fetchFailed"));
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

      const isChildType = ["my_feeling", "partner_feeling", "memo"].includes(newItemType);

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
          parent_item_id: isChildType ? newItemParentId : null,
        }),
      });

      if (res.ok) {
        toast.success(t("itemAddedSuccess"));
        setIsAddDialogOpen(false);
        setNewItemContent("");
        setNewItemType("promise");
        setNewItemAssignee("self");
        setNewItemReviewPeriod("1month");
        setNewItemParentId("");
        setIsAddingChildMode(false);
        fetchTopic();
      } else {
        const error = await res.json();
        toast.error(error.error || t("recordingFailed"));
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error(t("recordingFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const createNewTopic = async () => {
    if (!newTopicTitle.trim()) return;

    setIsCreatingTopic(true);
    try {
      const res = await fetch("/api/kizuna/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTopicTitle.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(t("themeCreatedSuccess"));
        setIsNewTopicDialogOpen(false);
        setNewTopicTitle("");
        // 新しいテーマのページに遷移
        router.push(`/kizuna/${data.topic.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || t("recordingFailed"));
      }
    } catch (error) {
      console.error("Error creating topic:", error);
      toast.error(t("recordingFailed"));
    } finally {
      setIsCreatingTopic(false);
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
        toast.success(t("recordingFeedback"));
        setIsFeedbackDialogOpen(false);
        setFeedbackTargetItem(null);
        setFeedbackRating("");
        setFeedbackComment("");
        fetchTopic();
      } else {
        const error = await res.json();
        toast.error(error.error || t("recordingFailed"));
      }
    } catch (error) {
      console.error("Error adding feedback:", error);
      toast.error(t("recordingFailed"));
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
          completed: t("reviewSaveLabelCompleted"),
          continue: t("reviewSaveLabelContinue"),
          modified: t("reviewSaveLabelModified"),
          abandoned: t("reviewSaveLabelAbandoned"),
        };
        toast.success(resultLabels[reviewResult as keyof typeof resultLabels] || t("reviewSavedSuccess"));
        setIsReviewDialogOpen(false);
        setReviewTargetItem(null);
        setReviewResult("");
        setReviewNote("");
        setReviewNewContent("");
        setReviewNewPeriod("1month");
        fetchTopic();
      } else {
        const error = await res.json();
        toast.error(error.error || t("reviewSaveFailed"));
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(t("reviewSaveFailed"));
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
        toast.success(t("themeResolvedSuccess"));
        setIsResolveDialogOpen(false);

        // 楽観的UI更新: サイドバーのステータスを即座に更新
        setAllTopics(prev =>
          prev.map(t => t.id === id ? { ...t, status: "resolved" as const } : t)
        );

        fetchTopic();
      } else {
        toast.error(tc("errorOccurred"));
      }
    } catch (error) {
      console.error("Error resolving topic:", error);
      toast.error(tc("errorOccurred"));
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
        toast.success(t("themeReopenedSuccess"));

        // 楽観的UI更新: サイドバーのステータスを即座に更新
        setAllTopics(prev =>
          prev.map(t => t.id === id ? { ...t, status: "active" as const } : t)
        );

        fetchTopic();
      } else {
        toast.error(tc("errorOccurred"));
      }
    } catch (error) {
      console.error("Error reopening topic:", error);
      toast.error(tc("errorOccurred"));
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
        <Header
          reviewDueCount={0}
          allTopics={allTopics}
          currentTopicId={id}
          currentTopicTitle={tc("loading")}
          t={t}
          tc={tc}
        />
        <div className="flex">
          <Sidebar topics={allTopics} currentTopicId={id} onNewTopic={() => setIsNewTopicDialogOpen(true)} t={t} />
          <main className="flex-1 px-4 py-8 md:pl-8 max-w-2xl mx-auto md:mx-0">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!topic) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        reviewDueCount={reviewDueCount}
        allTopics={allTopics}
        currentTopicId={id}
        currentTopicTitle={topic.title}
        t={t}
        tc={tc}
      />

      <div className="flex">
        {/* PC用サイドバー */}
        <Sidebar
          topics={allTopics}
          currentTopicId={id}
          onNewTopic={() => setIsNewTopicDialogOpen(true)}
          t={t}
        />

        {/* メインコンテンツ */}
        <main className="flex-1 px-4 py-8 md:pl-8 max-w-2xl mx-auto md:mx-0">
        {/* テーマヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <TopicStatusIcon status={topic.status} size={28} />
            <h1 className="text-2xl font-bold">{topic.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{t("started")}: {formatDate(topic.created_at)}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                topic.status === "resolved"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {topic.status === "resolved" ? t("resolvedLabel") : t("continueLabel")}
            </span>
          </div>
        </div>

        {/* レビュー待ちバナー */}
        {reviewDueCount > 0 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
            <ReviewDueIcon size={20} />
            <p className="text-sm text-orange-800">
              {t("reviewDueCount", { count: reviewDueCount })}
            </p>
          </div>
        )}

        {/* 親カード一覧 */}
        <div className="space-y-4 mb-8">
          {parentItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="flex justify-center mb-4">
                  <EmptyStateIcon size={48} />
                </div>
                <p className="text-muted-foreground mb-2">{t("emptyItems")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("emptyDescription")}
                </p>
              </CardContent>
            </Card>
          ) : (
            parentItems.map((parentItem) => (
              <ParentCard
                key={parentItem.id}
                item={parentItem}
                isExpanded={expandedCardId === parentItem.id}
                onToggleExpand={() => setExpandedCardId(
                  expandedCardId === parentItem.id ? null : parentItem.id
                )}
                onFeedbackClick={() => {
                  setFeedbackTargetItem(parentItem);
                  setIsFeedbackDialogOpen(true);
                }}
                onReviewClick={() => {
                  setReviewTargetItem(parentItem);
                  setReviewNewContent(parentItem.content);
                  setReviewNewPeriod(parentItem.review_period || "1month");
                  setIsReviewDialogOpen(true);
                }}
                onAddChildClick={() => {
                  setNewItemParentId(parentItem.id);
                  setIsAddingChildMode(true);
                  setNewItemType("my_feeling");
                  setIsAddDialogOpen(true);
                }}
                t={t}
              />
            ))
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => {
              setIsAddingChildMode(false);
              setNewItemType("promise");
              setNewItemParentId("");
              setIsAddDialogOpen(true);
            }}>
              {t("addParentCard")}
            </Button>
            {topic.status === "active" ? (
              <Button
                variant="outline"
                onClick={() => setIsResolveDialogOpen(true)}
                className="gap-2"
              >
                <CelebrateIcon size={16} />
                {t("markResolved")}
              </Button>
            ) : (
              <Button variant="outline" onClick={reopenTopic} className="gap-2">
                <ReopenIcon size={16} />
                {t("reopen")}
              </Button>
            )}
          </div>
        </div>
      </main>
      </div>

      {/* 項目追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          setIsAddingChildMode(false);
          setNewItemParentId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAddingChildMode ? t("addChildCard") : t("addParentCard")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 子カード追加モード: 親カードの選択表示 */}
            {isAddingChildMode && newItemParentId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t("selectParentCard")}</p>
                <p className="text-sm font-medium">
                  {parentItems.find(p => p.id === newItemParentId)?.content.substring(0, 50)}
                  {(parentItems.find(p => p.id === newItemParentId)?.content.length || 0) > 50 ? "..." : ""}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{t("itemType")}</label>
              <Select value={newItemType} onValueChange={setNewItemType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* 親カードモード: 約束・要望・検討のみ */}
                  {!isAddingChildMode && (
                    <>
                      <SelectItem value="promise">
                        <span className="flex items-center gap-2">
                          <ItemTypeIcon type="promise" size={16} />
                          {t("promise")}
                        </span>
                      </SelectItem>
                      <SelectItem value="request">
                        <span className="flex items-center gap-2">
                          <ItemTypeIcon type="request" size={16} />
                          {t("request")}
                        </span>
                      </SelectItem>
                      <SelectItem value="discussion">
                        <span className="flex items-center gap-2">
                          <ItemTypeIcon type="discussion" size={16} />
                          {t("discussion")}
                        </span>
                      </SelectItem>
                    </>
                  )}
                  {/* 子カードモード: 気持ち・メモのみ */}
                  {isAddingChildMode && (
                    <>
                      <SelectItem value="my_feeling">
                        <span className="flex items-center gap-2">
                          <ItemTypeIcon type="my_feeling" size={16} />
                          {t("myFeeling")}
                        </span>
                      </SelectItem>
                      <SelectItem value="partner_feeling">
                        <span className="flex items-center gap-2">
                          <ItemTypeIcon type="partner_feeling" size={16} />
                          {t("partnerFeeling")}
                        </span>
                      </SelectItem>
                      <SelectItem value="memo">
                        <span className="flex items-center gap-2">
                          <ItemTypeIcon type="memo" size={16} />
                          {t("memo")}
                        </span>
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {["promise", "request"].includes(newItemType) && (
              <div>
                <label className="text-sm font-medium">{t("assignee")}</label>
                <Select value={newItemAssignee} onValueChange={setNewItemAssignee}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">{t("self")}</SelectItem>
                    <SelectItem value="partner">{t("partner")}</SelectItem>
                    <SelectItem value="both">{t("both")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {newItemType === "promise" && (
              <div>
                <label className="text-sm font-medium">{t("reviewPeriod")}</label>
                <Select value={newItemReviewPeriod} onValueChange={setNewItemReviewPeriod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">{t("oneWeek")}</SelectItem>
                    <SelectItem value="2weeks">{t("twoWeeks")}</SelectItem>
                    <SelectItem value="1month">{t("oneMonth")}</SelectItem>
                    <SelectItem value="3months">{t("threeMonths")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("reviewHint")}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{t("content")}</label>
              <Textarea
                className="mt-1"
                placeholder={
                  newItemType === "promise"
                    ? t("promiseExample")
                    : newItemType === "request"
                    ? t("requestExample")
                    : newItemType === "discussion"
                    ? t("discussionExample")
                    : newItemType === "my_feeling"
                    ? t("myFeelingExample")
                    : newItemType === "partner_feeling"
                    ? t("partnerFeelingExample")
                    : t("memoExample")
                }
                value={newItemContent}
                onChange={(e) => setNewItemContent(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={addItem}
              disabled={isSubmitting || !newItemContent.trim()}
            >
              {isSubmitting ? t("addingButton") : t("addButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 相手の評価ダイアログ */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("partnerRating")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {feedbackTargetItem && (
              <div className="p-3 bg-muted rounded">
                <p className="text-sm">{feedbackTargetItem.content}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{t("ratingLabel")}</label>
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
              <label className="text-sm font-medium">{t("comment")}</label>
              <Textarea
                className="mt-1"
                placeholder={t("commentHint")}
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
              {tc("cancel")}
            </Button>
            <Button
              onClick={addFeedback}
              disabled={isSubmitting || !feedbackRating}
            >
              {isSubmitting ? t("sendingButton") : t("sendButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 振り返りダイアログ */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReviewIcon size={20} />
              {t("reviewTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewTargetItem && (
              <>
                <div className="p-3 bg-muted rounded">
                  <p className="text-sm font-medium mb-1">{t("promiseContent")}</p>
                  <p className="text-sm">{reviewTargetItem.content}</p>
                </div>

                {reviewTargetItem.feedbacks && reviewTargetItem.feedbacks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">{t("ratingHistory")}</p>
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
              <label className="text-sm font-medium">{t("whatToDo")}</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { value: "completed", label: t("completed"), desc: t("completedDesc") },
                  { value: "continue", label: t("continue"), desc: t("continueDesc") },
                  { value: "modified", label: t("modified"), desc: t("modifiedDesc") },
                  { value: "abandoned", label: t("abandoned"), desc: t("abandonedDesc") },
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
                <label className="text-sm font-medium">{t("newContent")}</label>
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
                <label className="text-sm font-medium">{t("nextReviewPeriod")}</label>
                <Select value={reviewNewPeriod} onValueChange={setReviewNewPeriod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">{t("oneWeek")}</SelectItem>
                    <SelectItem value="2weeks">{t("twoWeeks")}</SelectItem>
                    <SelectItem value="1month">{t("oneMonth")}</SelectItem>
                    <SelectItem value="3months">{t("threeMonths")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{t("reviewNote")}</label>
              <Textarea
                className="mt-1"
                placeholder={t("reviewNoteHint")}
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
              {tc("cancel")}
            </Button>
            <Button
              onClick={submitReview}
              disabled={isSubmitting || !reviewResult}
            >
              {isSubmitting ? t("savingButton") : t("saveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解決確認ダイアログ */}
      <AlertDialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePrompt")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={resolveTopic}>
              {t("confirmResolve")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 新規テーマ作成ダイアログ */}
      <Dialog open={isNewTopicDialogOpen} onOpenChange={setIsNewTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいテーマを作成</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">テーマ名</label>
            <Input
              className="mt-1"
              placeholder="例: 家事の分担について"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              話し合いたいテーマを入力してください
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewTopicDialogOpen(false);
                setNewTopicTitle("");
              }}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={createNewTopic}
              disabled={!newTopicTitle.trim() || isCreatingTopic}
            >
              {isCreatingTopic ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                  振り返り
                </span>
              )}
            </div>

            <p className={`text-sm ${isInactive ? "line-through" : ""}`}>
              {item.content}
            </p>

            {/* レビュー日 */}
            {item.review_date && item.status === "active" && (
              <p className="text-xs text-muted-foreground mt-1">
                次の振り返り: {formatTime(item.review_date)}
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
              <div className="mt-3 flex gap-2">
                {["promise", "request"].includes(item.type) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm font-medium gap-1.5 px-3 py-1.5 h-auto"
                    onClick={onFeedbackClick}
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
                      <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
                      <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                    </svg>
                    相手の評価
                  </Button>
                )}
                {item.type === "promise" && item.review_date && (
                  <Button
                    variant={isReviewDue ? "default" : "outline"}
                    size="sm"
                    className={`text-sm font-medium gap-1.5 px-3 py-1.5 h-auto ${
                      isReviewDue ? "bg-orange-500 hover:bg-orange-600" : ""
                    }`}
                    onClick={onReviewClick}
                  >
                    <ReviewIcon size={14} />
                    振り返り
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

// 親カード（約束・要望・検討）コンポーネント - アコーディオン展開式
function ParentCard({
  item,
  isExpanded,
  onToggleExpand,
  onFeedbackClick,
  onReviewClick,
  onAddChildClick,
  t,
}: {
  item: ParentItemWithChildren;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onFeedbackClick: () => void;
  onReviewClick: () => void;
  onAddChildClick: () => void;
  t: any;
}) {
  const config = typeConfig[item.type];
  const isReviewDue =
    item.status === "active" &&
    item.review_date &&
    new Date(item.review_date) <= new Date();
  const isInactive = ["completed", "modified", "abandoned"].includes(item.status);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className={isInactive ? "opacity-60" : ""}>
      <CardContent className="py-4">
        {/* 親カードヘッダー */}
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
                  振り返り
                </span>
              )}
            </div>

            <p className={`text-sm ${isInactive ? "line-through" : ""}`}>
              {item.content}
            </p>

            {/* レビュー日 */}
            {item.review_date && item.status === "active" && (
              <p className="text-xs text-muted-foreground mt-1">
                次の振り返り: {formatTime(item.review_date)}
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

            {/* アクションボタン（親カード用） */}
            {item.status === "active" && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {["promise", "request"].includes(item.type) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm font-medium gap-1.5 px-3 py-1.5 h-auto"
                    onClick={onFeedbackClick}
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
                      <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
                      <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                    </svg>
                    相手の評価
                  </Button>
                )}
                {item.type === "promise" && item.review_date && (
                  <Button
                    variant={isReviewDue ? "default" : "outline"}
                    size="sm"
                    className={`text-sm font-medium gap-1.5 px-3 py-1.5 h-auto ${
                      isReviewDue ? "bg-orange-500 hover:bg-orange-600" : ""
                    }`}
                    onClick={onReviewClick}
                  >
                    <ReviewIcon size={14} />
                    振り返り
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 子カード展開トグル */}
        <div className="mt-4 border-t pt-3">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
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
              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            <span>
              {t("childrenTitle")} ({item.children?.length || 0})
            </span>
          </button>

          {/* 子カード一覧（展開時） */}
          {isExpanded && (
            <div className="mt-3 space-y-2">
              {item.children && item.children.length > 0 ? (
                item.children.map((child) => (
                  <CompactItem key={child.id} item={child} />
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  {t("noChildren")}
                </p>
              )}

              {/* 子カード追加ボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
                onClick={onAddChildClick}
              >
                + {t("addChildCard")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// PCサイドバー
function Sidebar({
  topics,
  currentTopicId,
  onNewTopic,
  t,
}: {
  topics: TopicListItem[];
  currentTopicId: string;
  onNewTopic: () => void;
  t: any;
}) {
  const activeTopics = topics.filter((t) => t.status === "active");
  const resolvedTopics = topics.filter((t) => t.status === "resolved");

  return (
    <aside className="hidden md:block w-64 border-r bg-muted/30 min-h-[calc(100vh-56px)] sticky top-14 self-start">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base text-muted-foreground">{t("themesTitle")}</h2>
          <Button
            variant="default"
            size="sm"
            className="h-9 px-4 text-sm font-medium"
            onClick={onNewTopic}
          >
            + 新規
          </Button>
        </div>

        {/* 継続中のテーマ */}
        {activeTopics.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 px-2">{t("continueLabel")}</p>
            <nav className="space-y-1">
              {activeTopics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/kizuna/${topic.id}`}
                  className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
                    topic.id === currentTopicId
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <TopicStatusIcon status={topic.status} size={16} />
                  <span className="flex-1 truncate">{topic.title}</span>
                  {topic.review_due_count > 0 && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] bg-orange-500 text-white rounded-full">
                      {topic.review_due_count}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* 解決済みのテーマ */}
        {resolvedTopics.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 px-2">{t("resolvedLabel")}</p>
            <nav className="space-y-1">
              {resolvedTopics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/kizuna/${topic.id}`}
                  className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
                    topic.id === currentTopicId
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <TopicStatusIcon status={topic.status} size={16} />
                  <span className="flex-1 truncate">{topic.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {topics.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("emptyItems")}
          </p>
        )}

        {/* 振り返り履歴リンク */}
        <div className="mt-6 pt-4 border-t">
          <Link
            href="/kizuna/history"
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <HistoryIcon size={16} />
            <span>振り返り履歴</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ヘッダー（モバイル用ドロップダウン付き）
function Header({
  reviewDueCount = 0,
  allTopics,
  currentTopicId,
  currentTopicTitle,
  t,
  tc,
}: {
  reviewDueCount?: number;
  allTopics: TopicListItem[];
  currentTopicId: string;
  currentTopicTitle: string;
  t: any;
  tc: any;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* PC: 絆ノートへ戻る */}
        <button
          onClick={() => router.back()}
          className="hidden md:flex items-center gap-2 hover:text-primary transition-colors"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{t("backToKizuna")}</span>
          {reviewDueCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
              {reviewDueCount}
            </span>
          )}
        </button>

        {/* モバイル: テーマ切替ドロップダウン */}
        <div className="md:hidden relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
          >
            <TopicStatusIcon status="active" size={16} />
            <span className="text-sm font-medium max-w-[150px] truncate">
              {currentTopicTitle}
            </span>
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
              className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* ドロップダウンメニュー */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-64 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  {allTopics.filter((t) => t.status === "active").length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground px-2 py-1">{t("continueLabel")}</p>
                      {allTopics
                        .filter((t) => t.status === "active")
                        .map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => {
                              router.push(`/kizuna/${topic.id}`);
                              setIsDropdownOpen(false);
                            }}
                            className={`flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm text-left transition-colors ${
                              topic.id === currentTopicId
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            <TopicStatusIcon status={topic.status} size={16} />
                            <span className="flex-1 truncate">{topic.title}</span>
                            {topic.review_due_count > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-orange-500 text-white rounded-full">
                                {topic.review_due_count}
                              </span>
                            )}
                          </button>
                        ))}
                    </>
                  )}
                  {allTopics.filter((t) => t.status === "resolved").length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground px-2 py-1 mt-2">{t("resolvedLabel")}</p>
                      {allTopics
                        .filter((t) => t.status === "resolved")
                        .map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => {
                              router.push(`/kizuna/${topic.id}`);
                              setIsDropdownOpen(false);
                            }}
                            className={`flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm text-left transition-colors ${
                              topic.id === currentTopicId
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <TopicStatusIcon status={topic.status} size={16} />
                            <span className="flex-1 truncate">{topic.title}</span>
                          </button>
                        ))}
                    </>
                  )}
                  <div className="border-t mt-2 pt-2">
                    <Link
                      href="/kizuna"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted text-primary"
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
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                      {t("addNewItem").replace("項目", "テーマ")}
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* 振り返りボタン */}
          <Link
            href="/kizuna/history"
            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-xs md:text-sm font-medium"
          >
            <HistoryIcon size={14} className="md:w-4 md:h-4" />
            <span>{t("historyLabel")}</span>
          </Link>

          <Link href="/dashboard" className="text-lg md:text-xl font-bold text-primary">
            {tc("appName")}
          </Link>
        </div>
      </div>
    </header>
  );
}
