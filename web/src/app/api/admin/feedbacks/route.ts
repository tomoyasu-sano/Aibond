/**
 * Admin Feedbacks API
 * GET /api/admin/feedbacks - Get feedback list
 */

import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service role clientを使用してRLSをバイパス
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const rating = searchParams.get("rating");

    // フィードバック一覧を取得
    let query = supabaseAdmin
      .from("feedbacks")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (rating) {
      query = query.eq("rating", rating);
    }

    const { data: feedbacks, error } = await query;

    if (error) {
      console.error("[Admin Feedbacks] Query error:", error);
      return NextResponse.json({ feedbacks: [], totalCount: 0 });
    }

    // 総数を取得
    const { count: totalCount } = await supabaseAdmin
      .from("feedbacks")
      .select("id", { count: "exact", head: true });

    // 評価別の集計
    const { data: allFeedbacks } = await supabaseAdmin
      .from("feedbacks")
      .select("rating");

    const ratingBreakdown: Record<string, number> = {};
    allFeedbacks?.forEach((fb) => {
      const r = fb.rating || "no_rating";
      ratingBreakdown[r] = (ratingBreakdown[r] || 0) + 1;
    });

    return NextResponse.json({
      feedbacks: feedbacks || [],
      totalCount: totalCount || 0,
      ratingBreakdown,
      page,
      limit,
    });
  } catch (error) {
    console.error("[Admin Feedbacks] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedbacks" },
      { status: 500 }
    );
  }
}
