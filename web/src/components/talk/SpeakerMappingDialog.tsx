"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SpeakerInfo {
  user_id: string | null;
  name: string | null;
  samples: string[];
}

interface PartnerInfo {
  currentUser: { id: string; name: string };
  partner: { id: string; name: string };
}

interface SpeakerMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talkId: string;
  onMappingComplete?: () => void;
}

export function SpeakerMappingDialog({
  open,
  onOpenChange,
  talkId,
  onMappingComplete,
}: SpeakerMappingDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speakers, setSpeakers] = useState<{
    speaker1: SpeakerInfo;
    speaker2: SpeakerInfo;
  } | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);

  // マッピング選択状態
  const [speaker1Selection, setSpeaker1Selection] = useState<
    "me" | "partner" | "custom"
  >("me");
  const [speaker2Selection, setSpeaker2Selection] = useState<
    "me" | "partner" | "custom"
  >("partner");
  const [speaker1CustomName, setSpeaker1CustomName] = useState("");
  const [speaker2CustomName, setSpeaker2CustomName] = useState("");

  useEffect(() => {
    if (open) {
      fetchSpeakerInfo();
    }
  }, [open, talkId]);

  const fetchSpeakerInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/talks/${talkId}/speakers`);
      if (res.ok) {
        const data = await res.json();
        setSpeakers(data.speakers);
        setPartnerInfo(data.partnerInfo);

        // 既存のマッピングがあれば設定
        if (data.speakers?.speaker1?.user_id) {
          if (
            data.partnerInfo?.currentUser?.id === data.speakers.speaker1.user_id
          ) {
            setSpeaker1Selection("me");
          } else if (
            data.partnerInfo?.partner?.id === data.speakers.speaker1.user_id
          ) {
            setSpeaker1Selection("partner");
          } else {
            setSpeaker1Selection("custom");
            setSpeaker1CustomName(data.speakers.speaker1.name || "");
          }
        }
        if (data.speakers?.speaker2?.user_id) {
          if (
            data.partnerInfo?.currentUser?.id === data.speakers.speaker2.user_id
          ) {
            setSpeaker2Selection("me");
          } else if (
            data.partnerInfo?.partner?.id === data.speakers.speaker2.user_id
          ) {
            setSpeaker2Selection("partner");
          } else {
            setSpeaker2Selection("custom");
            setSpeaker2CustomName(data.speakers.speaker2.name || "");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching speaker info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const updateData: Record<string, string | null> = {};

      // Speaker 1
      if (speaker1Selection === "me" && partnerInfo) {
        updateData.speaker1_user_id = partnerInfo.currentUser.id;
        updateData.speaker1_name = partnerInfo.currentUser.name;
      } else if (speaker1Selection === "partner" && partnerInfo) {
        updateData.speaker1_user_id = partnerInfo.partner.id;
        updateData.speaker1_name = partnerInfo.partner.name;
      } else {
        updateData.speaker1_user_id = null;
        updateData.speaker1_name = speaker1CustomName || "話者1";
      }

      // Speaker 2
      if (speaker2Selection === "me" && partnerInfo) {
        updateData.speaker2_user_id = partnerInfo.currentUser.id;
        updateData.speaker2_name = partnerInfo.currentUser.name;
      } else if (speaker2Selection === "partner" && partnerInfo) {
        updateData.speaker2_user_id = partnerInfo.partner.id;
        updateData.speaker2_name = partnerInfo.partner.name;
      } else {
        updateData.speaker2_user_id = null;
        updateData.speaker2_name = speaker2CustomName || "話者2";
      }

      const res = await fetch(`/api/talks/${talkId}/speakers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success("話者を設定しました");
        onOpenChange(false);
        onMappingComplete?.();
      } else {
        toast.error("話者の設定に失敗しました");
      }
    } catch (error) {
      console.error("Error saving speaker mapping:", error);
      toast.error("話者の設定に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>話者を設定</DialogTitle>
          <DialogDescription>
            録音された会話の話者を識別してください。サンプル発言を参考に、どちらが誰かを選択してください。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Speaker 1 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">話者1</Label>
              {speakers?.speaker1?.samples &&
                speakers.speaker1.samples.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground mb-1">サンプル発言:</p>
                    <ul className="space-y-1">
                      {speakers.speaker1.samples.map((sample, i) => (
                        <li key={i} className="truncate">
                          「{sample}」
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              <div className="flex gap-2 flex-wrap">
                {partnerInfo && (
                  <>
                    <Button
                      type="button"
                      variant={
                        speaker1Selection === "me" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSpeaker1Selection("me")}
                    >
                      {partnerInfo.currentUser.name}（自分）
                    </Button>
                    <Button
                      type="button"
                      variant={
                        speaker1Selection === "partner" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSpeaker1Selection("partner")}
                    >
                      {partnerInfo.partner.name}
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant={
                    speaker1Selection === "custom" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSpeaker1Selection("custom")}
                >
                  その他
                </Button>
              </div>
              {speaker1Selection === "custom" && (
                <Input
                  placeholder="名前を入力"
                  value={speaker1CustomName}
                  onChange={(e) => setSpeaker1CustomName(e.target.value)}
                />
              )}
            </div>

            {/* Speaker 2 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">話者2</Label>
              {speakers?.speaker2?.samples &&
                speakers.speaker2.samples.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground mb-1">サンプル発言:</p>
                    <ul className="space-y-1">
                      {speakers.speaker2.samples.map((sample, i) => (
                        <li key={i} className="truncate">
                          「{sample}」
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              <div className="flex gap-2 flex-wrap">
                {partnerInfo && (
                  <>
                    <Button
                      type="button"
                      variant={
                        speaker2Selection === "me" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSpeaker2Selection("me")}
                    >
                      {partnerInfo.currentUser.name}（自分）
                    </Button>
                    <Button
                      type="button"
                      variant={
                        speaker2Selection === "partner" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSpeaker2Selection("partner")}
                    >
                      {partnerInfo.partner.name}
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant={
                    speaker2Selection === "custom" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSpeaker2Selection("custom")}
                >
                  その他
                </Button>
              </div>
              {speaker2Selection === "custom" && (
                <Input
                  placeholder="名前を入力"
                  value={speaker2CustomName}
                  onChange={(e) => setSpeaker2CustomName(e.target.value)}
                />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            スキップ
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
