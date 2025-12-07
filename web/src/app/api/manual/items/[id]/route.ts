import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MANUAL_CATEGORIES } from '@/lib/manual/config';
import type { UpdateManualItemRequest } from '@/types/manual';

/**
 * PUT /api/manual/items/:id
 * 取説項目を更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const body: UpdateManualItemRequest = await request.json();
    const { question, answer, date, category } = body;

    // バリデーション
    if (category && !Object.keys(MANUAL_CATEGORIES).includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // 更新データを準備
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (date !== undefined) updateData.date = date;
    if (category !== undefined) updateData.category = category;

    // 項目を更新
    const { data: updatedItem, error } = await supabase
      .from('manual_items')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating manual item:', error);
      return NextResponse.json({ error: 'Failed to update manual item' }, { status: 500 });
    }

    if (!updatedItem) {
      return NextResponse.json({ error: 'Manual item not found' }, { status: 404 });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Unexpected error in PUT /api/manual/items/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/manual/items/:id
 * 取説項目を論理削除（deleted_at を設定）
 * user_id または target_user_id が自分の場合に削除可能
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 項目を論理削除（deleted_at を設定）
    // user_id または target_user_id が自分の場合に削除可能
    const { data: deletedItem, error } = await supabase
      .from('manual_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error deleting manual item:', error);
      return NextResponse.json({ error: 'Failed to delete manual item', details: error.message }, { status: 500 });
    }

    if (!deletedItem) {
      return NextResponse.json({ error: 'Manual item not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Manual item deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/manual/items/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
