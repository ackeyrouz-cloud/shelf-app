import { supabase } from './supabase';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';

// Account deletion can't happen from the client at all — deleting an
// auth.users row requires the Supabase service role key, which must never
// ship inside the app (same reasoning as the Anthropic key living
// server-side). This calls our own backend, which verifies the caller's
// token server-side before using its own admin credential to actually delete.
export async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error || 'Failed to delete account.');
    }
    return body;
  } finally {
    clearTimeout(timeoutId);
  }
}
