import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-project')
);

// Fallback mock client wrapper if environment variables are not yet configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
      }
    });

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'judge' | 'mentor';
  created_at?: string;
  updated_at?: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}
