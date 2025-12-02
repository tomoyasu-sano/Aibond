-- Manual Items Table for Partner Manual Feature
-- This table stores manual/instruction items for users and their partners

-- Create manual_items table
CREATE TABLE public.manual_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_id UUID, -- Partnership ID (no foreign key constraint yet)
  target_user_id UUID NOT NULL REFERENCES auth.users(id), -- Who this manual is about (self or partner)

  category TEXT NOT NULL, -- "basic", "personality", "hobbies", "communication", "lifestyle", "other"
  question TEXT NOT NULL, -- Question content
  answer TEXT NOT NULL DEFAULT '', -- Answer content (can be empty)
  color TEXT, -- Book color (user customizable) e.g. "#FFB6B9"
  is_fixed BOOLEAN DEFAULT FALSE, -- Whether this is a fixed question (initial 5 are true)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT non_empty_question CHECK(length(question) > 0),
  CONSTRAINT valid_category CHECK(category IN ('basic', 'personality', 'hobbies', 'communication', 'lifestyle', 'other'))
);

-- Create indexes
CREATE INDEX idx_manual_items_user ON manual_items(user_id);
CREATE INDEX idx_manual_items_target ON manual_items(target_user_id);
CREATE INDEX idx_manual_items_partnership ON manual_items(partnership_id);
CREATE INDEX idx_manual_items_category ON manual_items(category);

-- Enable Row Level Security
ALTER TABLE public.manual_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own manual items
CREATE POLICY "Users can view their own manual items"
  ON public.manual_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own manual items
CREATE POLICY "Users can insert their own manual items"
  ON public.manual_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own manual items
CREATE POLICY "Users can update their own manual items"
  ON public.manual_items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own manual items
CREATE POLICY "Users can delete their own manual items"
  ON public.manual_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can view partner's manual items (where they are target_user)
CREATE POLICY "Users can view manual items about themselves"
  ON public.manual_items
  FOR SELECT
  USING (auth.uid() = target_user_id);

-- Note: handle_new_user() function is NOT modified here to avoid conflicts
-- Manual items for new users should be created separately if needed

-- Helper function to initialize partner manual items when partnership is established
CREATE OR REPLACE FUNCTION public.initialize_partner_manual_items(
  p_user_id UUID,
  p_partner_id UUID,
  p_partnership_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Create 5 fixed questions for partner's manual (answers are empty)
  INSERT INTO public.manual_items (user_id, target_user_id, partnership_id, category, question, answer, is_fixed)
  VALUES
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '好きな色', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '好きな音楽・アーティスト', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '嫌いな食べ物', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '大切にしている価値観', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '絶対に許せないこと', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
