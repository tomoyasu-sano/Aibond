-- Manual Items Table for Partner Manual Feature
-- This table stores manual/instruction items for users and their partners

-- Create manual_items table
CREATE TABLE public.manual_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
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

-- RLS Policy: Users can view partner's manual items (if connected via partnership)
CREATE POLICY "Users can view partner's manual items"
  ON public.manual_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = manual_items.partnership_id
      AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );

-- Update handle_new_user() function to create initial manual items
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  current_period TEXT;
BEGIN
  -- Current period (YYYY-MM)
  current_period := to_char(NOW(), 'YYYY-MM');

  -- Create user_profiles
  INSERT INTO public.user_profiles (id, name, language)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'ユーザー'), 'ja');

  -- Create subscriptions (initialize with Free plan)
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  -- Create usage (for current month)
  INSERT INTO public.usage (user_id, period, minutes_used, minutes_limit)
  VALUES (NEW.id, current_period, 0, 120); -- Free: 2 hours = 120 minutes

  -- Create manual_items (5 fixed questions - user's own manual)
  INSERT INTO public.manual_items (user_id, target_user_id, category, question, answer, is_fixed)
  VALUES
    (NEW.id, NEW.id, 'basic', '好きな色', '', true),
    (NEW.id, NEW.id, 'basic', '好きな音楽・アーティスト', '', true),
    (NEW.id, NEW.id, 'basic', '嫌いな食べ物', '', true),
    (NEW.id, NEW.id, 'basic', '大切にしている価値観', '', true),
    (NEW.id, NEW.id, 'basic', '絶対に許せないこと', '', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
