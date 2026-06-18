import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  home_address: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  car_make: string | null;
  car_model: string | null;
  car_color: string | null;
  license_plate: string | null;
  car_seats: number | null;
  account_type: 'parent' | 'student';
  grade_level: string | null;
  avatar_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  parent_guardian_name: string | null;
  parent_guardian_phone: string | null;
  parent_guardian_email: string | null;
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}


/* eslint-disable react-refresh/only-export-components */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Re-export useAuth from the separate hook file for backward compatibility
export { useAuth } from "@/hooks/useAuth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (!data) {
      // Orphaned session — auth user has no profile row (e.g. account was deleted).
      // Sign out so the app doesn't hang on a forever-loading spinner ("blank white screen").
      console.warn('No profile found for user; clearing orphaned session.');
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) { /* best effort */ }
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) { /* noop */ }
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    setProfile(data as unknown as Profile);
  };

  const logout = async () => {
    // IMPORTANT: In some cases the backend may respond with `session_not_found`
    // (e.g. expired/revoked sessions). We still must clear the local persisted
    // session to prevent the app from “re-logging in” on refresh.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('Local sign out failed; attempting manual cleanup:', error);
    }

    // Best-effort cleanup of any persisted auth tokens.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        // Supabase auth tokens are stored under keys like: sb-<project-ref>-auth-token
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Manual auth storage cleanup failed:', error);
    }

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, logout, refreshProfile: async () => { if (user) await fetchProfile(user.id); } }}>
      {children}
    </AuthContext.Provider>
  );
};