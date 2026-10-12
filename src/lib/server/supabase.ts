import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../features/teams/server/database.types';
import { getServerEnvironment } from './env';

let serverClient: SupabaseClient<Database> | undefined;

export function getSupabaseServerClient() {
  if (typeof window !== 'undefined') throw new Error('Teams Supabase client는 서버에서만 생성할 수 있습니다.');

  if (!serverClient) {
    const { supabaseUrl, supabasePublishableKey, supabaseAccessToken } = getServerEnvironment();
    serverClient = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      accessToken: async () => supabaseAccessToken,
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
    });
  }

  return serverClient;
}
