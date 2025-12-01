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

    // 取説項目を取得
    const { data: items, error } = await supabase
      .from('manual_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('target_user_id', targetUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching manual items:', error);
      return NextResponse.json({ error: 'Failed to fetch manual items' }, { status: 500 });
    }

    // 統計情報を計算
    const stats = {
      total: items.length,
      byCategory: Object.keys(MANUAL_CATEGORIES).reduce((acc, category) => {
        acc[category as ManualCategory] = items.filter((item) => item.category === category).length;
        return acc;
      }, {} as Record<ManualCategory, number>),
    };

    const response: ManualItemsResponse = {
      items: items as ManualItem[],
      stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/manual:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
