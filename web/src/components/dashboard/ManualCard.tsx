import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

interface ManualCardProps {
  userId: string;
  partnershipId?: string | null;
}

export async function ManualCard({ userId, partnershipId }: ManualCardProps) {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");

  // 自分の取説の項目数を取得
  const { count: myItemsCount } = await supabase
    .from("manual_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("target_user_id", userId);

  // パートナーの取説の項目数を取得（パートナーがいる場合）
  let partnerItemsCount = 0;
  let partnerName = null;

  if (partnershipId) {
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("user1_id, user2_id")
      .eq("id", partnershipId)
      .single();

    if (partnership) {
      const partnerId = partnership.user1_id === userId ? partnership.user2_id : partnership.user1_id;

      // パートナーの項目数を取得
      const { count } = await supabase
        .from("manual_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("target_user_id", partnerId);

      partnerItemsCount = count || 0;

      // パートナーの名前を取得
      const { data: partnerProfile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("id", partnerId)
        .single();

      partnerName = partnerProfile?.display_name;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          {t("manual")}
        </CardTitle>
        <CardDescription>2人の取扱を作ろう</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/manual">
          <Button variant="outline" className="w-full">
            取説を作る
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
