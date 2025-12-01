import { ManualCategory } from '@/lib/manual/config';

export interface ManualItem {
  id: string;
  user_id: string;
  partnership_id: string | null;
  target_user_id: string;
  category: ManualCategory;
  question: string;
  answer: string;
  color: string | null;
  is_fixed: boolean;
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
  question?: string;
  answer?: string;
  color?: string;
  category?: ManualCategory;
}

export interface ManualItemsResponse {
  items: ManualItem[];
  stats: {
    total: number;
    byCategory: Record<ManualCategory, number>;
  };
}
