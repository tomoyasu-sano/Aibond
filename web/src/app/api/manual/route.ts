import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MANUAL_CATEGORIES } from '@/lib/manual/config';
import type { ManualItem, ManualItemsResponse, ManualCategory } from '@/types/manual';

/**
 * GET /api/manual
 * 取説項目一覧を取得
 * Query params:
 *   - target_user_id: 対象ユーザーID（自分 or パートナー）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('target_user_id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 });
    }

    // 取説項目を取得（パートナーシップ情報をJOINで取得、deleted_atがNULLのもののみ）
    const { data: items, error } = await supabase
      .from('manual_items')
      .select('*, partnership:partnerships!left(id, history_deleted_at)')
      .eq('user_id', user.id)
      .eq('target_user_id', targetUserId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching manual items:', error);
      return NextResponse.json({ error: 'Failed to fetch manual items' }, { status: 500 });
    }

    // フィルタリング: partnership_id が NULL か、history_deleted_at が NULL のもののみ
    const filteredItems = (items || []).filter((item) => {
      // partnership_id が NULL の場合は表示
      if (!item.partnership_id) return true;
      // partnership が取得できて、history_deleted_at が NULL の場合は表示
      const p = item.partnership as { id: string; history_deleted_at: string | null } | null;
      if (p && p.history_deleted_at === null) return true;
      // それ以外は非表示
      return false;
    });

    // partnership フィールドを除去
    const itemsWithoutPartnership = filteredItems.map(({ partnership, ...rest }) => rest);

    // 統計情報を計算（フィルタリング後のアイテムで計算）
    const stats = {
      total: itemsWithoutPartnership.length,
      byCategory: Object.keys(MANUAL_CATEGORIES).reduce((acc, category) => {
        acc[category as ManualCategory] = itemsWithoutPartnership.filter((item) => item.category === category).length;
        return acc;
      }, {} as Record<ManualCategory, number>),
    };

    const response: ManualItemsResponse = {
      items: itemsWithoutPartnership as ManualItem[],
      stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/manual:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
