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
    const { question, answer, color, category } = body;

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
    if (color !== undefined) updateData.color = color;
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
 * 取説項目を削除
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

    // 項目を削除
    const { error } = await supabase
      .from('manual_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting manual item:', error);
      return NextResponse.json({ error: 'Failed to delete manual item' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Manual item deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/manual/items/:id:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
