import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DocumentItem {
  id: string;
  category: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  document_url: string;
  notes: string;
}
