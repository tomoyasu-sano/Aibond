import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/manual/cover-image
 * カバー画像のURLを取得
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

    // target_user_idを取得
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('target_user_id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 });
    }

    // manual_coversテーブルから取得（updated_atも取得してキャッシュバスティング用に使用）
    const { data, error } = await supabase
      .from('manual_covers')
      .select('cover_image_url, updated_at')
      .eq('user_id', user.id)
      .eq('target_user_id', targetUserId)
      .single();

    if (error) {
      // レコードが見つからない場合は404ではなく、nullを返す
      if (error.code === 'PGRST116') {
        return NextResponse.json({ url: null });
      }
      console.error('Error fetching cover image:', error);
      return NextResponse.json({ error: 'Failed to fetch cover image' }, { status: 500 });
    }

    // キャッシュバスティング: URLにバージョンパラメータを付与
    let url = data.cover_image_url;
    if (url && data.updated_at) {
      const version = new Date(data.updated_at).getTime();
      url = `${url}?v=${version}`;
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Unexpected error in GET /api/manual/cover-image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/manual/cover-image
 * カバー画像をアップロード
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

    // FormDataから画像とtarget_user_idを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetUserId = formData.get('target_user_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 });
    }

    // ファイル名を生成（現在のユーザーID/対象ユーザーID/cover.<timestamp>.ext の形式）
    // タイムスタンプを付けることでキャッシュ衝突を回避
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const basePath = `${user.id}/${targetUserId}`;
    const fileName = `${basePath}/cover.${timestamp}.${fileExt}`;

    // 既存のカバー画像を削除（タイムスタンプ付きで複数ファイルが溜まるのを防ぐ）
    try {
      const { data: existingFiles } = await supabase.storage
        .from('manual-covers')
        .list(basePath);

      if (existingFiles && existingFiles.length > 0) {
        const filePaths = existingFiles.map(f => `${basePath}/${f.name}`);
        await supabase.storage.from('manual-covers').remove(filePaths);
      }
    } catch (e) {
      // 削除失敗しても続行
      console.log('Failed to delete existing cover images:', e);
    }

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('manual-covers')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // 既存のファイルを上書き
      });

    if (uploadError) {
      console.error('Error uploading cover image:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // 公開URLを取得
    const {
      data: { publicUrl },
    } = supabase.storage.from('manual-covers').getPublicUrl(fileName);

    // manual_coversテーブルに保存（upsert）
    const { error: dbError } = await supabase
      .from('manual_covers')
      .upsert(
        {
          user_id: user.id,
          target_user_id: targetUserId,
          cover_image_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,target_user_id',
        }
      );

    if (dbError) {
      console.error('Error saving cover URL to database:', dbError);
      // Storageには保存されているので、URLは返す
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Unexpected error in POST /api/manual/cover-image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
