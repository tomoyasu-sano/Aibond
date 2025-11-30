-- =====================================================
-- audio_files テーブル: トーク音声の保存
-- =====================================================

CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration_seconds INTEGER,
  format TEXT DEFAULT 'webm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audio_files_talk_id ON audio_files(talk_id);

-- RLS有効化
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分のパートナーシップの音声のみアクセス可能
CREATE POLICY "Users can view own partnership audio files"
  ON audio_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM talks t
      JOIN partnerships p ON t.partnership_id = p.id
      WHERE t.id = audio_files.talk_id
      AND (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own partnership audio files"
  ON audio_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM talks t
      JOIN partnerships p ON t.partnership_id = p.id
      WHERE t.id = audio_files.talk_id
      AND (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    )
  );

-- =====================================================
-- Supabase Storage バケット設定（手動でダッシュボードから作成）
-- =====================================================
-- バケット名: audio-files
-- Public: false (private)
-- File size limit: 500MB
-- Allowed MIME types: audio/webm, audio/ogg

-- Storage RLSポリシー（Supabase Dashboard → Storage → Policies で設定）:
--
-- SELECT (ダウンロード):
--   bucket_id = 'audio-files' AND auth.uid() IN (
--     SELECT p.user1_id FROM partnerships p
--     JOIN talks t ON t.partnership_id = p.id
--     JOIN audio_files af ON af.talk_id = t.id
--     WHERE af.file_path = name
--     UNION
--     SELECT p.user2_id FROM partnerships p
--     JOIN talks t ON t.partnership_id = p.id
--     JOIN audio_files af ON af.talk_id = t.id
--     WHERE af.file_path = name
--   )
--
-- INSERT (アップロード):
--   bucket_id = 'audio-files' AND auth.role() = 'authenticated'
