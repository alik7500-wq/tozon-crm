import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yeslzrrcwgcqfxhgbrqk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inllc2x6cnJjd2djcWZ4aGdicnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzY4NDAsImV4cCI6MjEwMjcxMjg0MH0.0vuWKpfkHxH9rdAYkyxuTGdsYlgUm4j01R7VmKdp0Gs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  }
});
