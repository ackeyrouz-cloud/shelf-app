import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ltojyhjzsgqcoswzpsju.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_C8KuPFP_lTrWZUBd-daSsQ_oK4oF1b_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Backend endpoints that call Anthropic (identify-ingredients, find-recipes,
// estimate-meal, estimate-meal-photo) require this Bearer token — same
// pattern deleteAccount() already used, pulled out here so every caller uses
// the identical path. Throws rather than returning empty headers on a
// missing session so a stale/expired session fails with a clear message
// instead of silently hitting the backend's 401.
export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${session.access_token}` };
}
