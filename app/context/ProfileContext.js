import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(undefined);

export function ProfileProvider({ children }) {
  const { userId } = useAuth();
  // undefined = not fetched yet, null = no profile row exists yet, object = profile data
  const [profile, setProfile] = useState(undefined);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setProfile(undefined);
    setProfileLoading(true);
    setProfileError('');
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (fetchError) {
      setProfileError("Couldn't load your profile. Check your connection and try again.");
    } else {
      setProfile(data);
    }
    setProfileLoading(false);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const needsOnboarding = !profile || profile.weight == null || profile.height == null || profile.age == null;

  const value = {
    profile,
    profileLoading,
    profileError,
    needsOnboarding,
    loadProfile,
    setProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
