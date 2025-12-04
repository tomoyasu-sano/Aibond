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
  date?: string;
  is_fixed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateManualItemRequest {
  target_user_id: string;
  category: ManualCategory;
  question: string;
  answer?: string;
  date?: string;
}

export interface UpdateManualItemRequest {
  category?: ManualCategory;
  question?: string;
  answer?: string;
  date?: string;
}

export interface ManualItemsResponse {
  items: ManualItem[];
  stats: {
    total: number;
    byCategory: Record<ManualCategory, number>;
  };
}
