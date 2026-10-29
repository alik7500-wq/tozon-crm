import { createClient } from '@supabase/supabase-js';

import {environment} from './environment';
const supabaseUrl=environment.supabaseUrl;
const supabaseAnonKey=environment.supabaseKey;

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
