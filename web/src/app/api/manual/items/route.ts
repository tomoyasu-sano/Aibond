import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MANUAL_CATEGORIES } from '@/lib/manual/config';
import type { CreateManualItemRequest } from '@/types/manual';

/**
 * POST /api/manual/items
 * 新しい取説項目を作成
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディ取得
    const body: CreateManualItemRequest = await request.json();
    const { target_user_id, category, question, answer = '', color } = body;

    // バリデーション
    if (!target_user_id || !category || !question) {
      return NextResponse.json(
        { error: 'target_user_id, category, and question are required' },
        { status: 400 }
      );
    }

    if (!Object.keys(MANUAL_CATEGORIES).includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // パートナーシップIDを取得（パートナーの取説の場合）
    let partnershipId = null;
    if (target_user_id !== user.id) {
      const { data: partnership } = await supabase
        .from('partnerships')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'active')
        .single();

      if (partnership) {
        partnershipId = partnership.id;
      }
    }

    // デフォルト色を取得
    const defaultColor = color || MANUAL_CATEGORIES[category].defaultColor;

    // 項目を作成
    const { data: newItem, error } = await supabase
      .from('manual_items')
      .insert({
        user_id: user.id,
        target_user_id,
        partnership_id: partnershipId,
        category,
        question,
        answer,
        color: defaultColor,
        is_fixed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating manual item:', error);
      return NextResponse.json({ error: 'Failed to create manual item' }, { status: 500 });
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/manual/items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
