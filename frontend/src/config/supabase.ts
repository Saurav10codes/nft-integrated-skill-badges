import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  created_at: string;
  last_login: string;
}

export interface Test {
  id: string;
  creator_wallet: string;
  title: string;
  description?: string;
  company?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  metadata_cid?: string;
  start_time: string;
  end_time: string;
  pass_score: number;
  total_questions: number;

  // Statistics
  view_count: number;
  registration_count: number;
  attempt_count: number;
  completion_count: number;
  pass_count: number;

  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  test_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
  created_at: string;
}

export interface Attempt {
  id: string;
  test_id: string;
  candidate_wallet: string;
  score: number;
  total_score: number;
  percentage: number;
  passed: boolean;
  answers?: Record<string, string>;
  created_at: string;
}

export interface Badge {
  id: string;
  test_id: string;
  wallet_address: string;
  nft_token_id?: string;
  mint_tx_hash?: string;
  metadata_url?: string;
  created_at: string;
}

export interface TestRegistration {
  id: string;
  test_id: string;
  wallet_address: string;
  registered_at: string;
}
