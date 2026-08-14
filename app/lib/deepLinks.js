import * as Linking from 'expo-linking';
import { supabase } from './supabase';

// Our Supabase client sets detectSessionInUrl: false (there's no browser URL
// bar in React Native), so an incoming auth deep link has to be exchanged
// for a session manually. exchangeCodeForSession fires the PASSWORD_RECOVERY
// event via onAuthStateChange when the code came from a reset-password email
// — AuthContext listens for that event, not this function's return value.
export async function handleAuthDeepLink(url) {
  if (!url) return;
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  if (typeof code === 'string' && code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
}

export function passwordResetRedirectUrl() {
  return Linking.createURL('reset-password');
}
