/**
 * Manual (取説) Types
 */

export type ManualCategory = 'basic' | 'personality' | 'hobbies' | 'communication' | 'lifestyle' | 'other';

export interface ManualItem {
  id: string;
  user_id: string;
  partnership_id?: string;
  target_user_id: string;
  category: ManualCategory;
  question: string;
  answer: string;
  color?: string;
  is_fixed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateManualItemRequest {
  target_user_id: string;
  category: ManualCategory;
  question: string;
  answer?: string;
  color?: string;
}

export interface UpdateManualItemRequest {
  category?: ManualCategory;
  question?: string;
  answer?: string;
  color?: string;
}
