import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { handleAuthDeepLink } from '../lib/deepLinks';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  // undefined = session not checked yet, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);
  // True from the moment a password-recovery link is opened until the user
  // finishes setting a new password — RootNavigator checks this before its
  // normal session-based routing, since exchanging the recovery code also
  // produces a normal-looking session that would otherwise drop the user
  // straight into the app instead of the "set new password" screen.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleAuthDeepLink);
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));
    return () => sub.remove();
  }, []);

  const value = {
    session,
    userId: session?.user?.id,
    isPasswordRecovery,
    clearPasswordRecovery: () => setIsPasswordRecovery(false),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
