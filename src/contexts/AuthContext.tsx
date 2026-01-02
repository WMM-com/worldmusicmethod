import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  emailVerified: boolean;
  signUp: (email: string, password: string, fullName: string, firstName?: string, lastName?: string) => Promise<{ error: Error | null; userId?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkAdminRole(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setEmailVerified(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await Promise.all([fetchProfile(session.user.id), checkAdminRole(session.user.id)]);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setEmailVerified(false);
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

    if (!error && data) {
      setProfile(data as Profile);
      setEmailVerified((data as any).email_verified === true);
    }
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    setIsAdmin(data === true);
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    firstName?: string,
    lastName?: string
  ) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return { error: new Error('A user with this email address already exists') };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    // Handle Supabase auth duplicate email error
    if (error?.message?.includes('already been registered') || error?.message?.includes('already exists')) {
      return { error: new Error('A user with this email address already exists') };
    }

    if (error) {
      return { error: error as Error };
    }

    const userId = data?.user?.id;

    // Send verification email via our custom function, then FORCE local sign-out.
    if (userId) {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-verification-email', {
          body: { user_id: userId },
        });

        if (emailError) {
          console.error('Failed to send verification email:', emailError);
        }
      } catch (err) {
        console.error('Error sending verification email:', err);
      }

      // Sign out immediately to prevent auto-login - user must verify email first
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        console.warn('Sign out after signup failed:', signOutError.message);
      }

      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setEmailVerified(false);
    }

    return { error: null, userId };
  };

  const resendVerificationEmail = async () => {
    if (!user?.id) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: { user_id: user.id },
      });

      if (error) {
        return { error: new Error(error.message || 'Failed to send verification email') };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    const userId = data.user.id;

    // Enforce custom email verification (profiles.email_verified)
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || profileRow?.email_verified !== true) {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setEmailVerified(false);

      return {
        error: new Error('Please verify your email before logging in. Check your inbox for the verification link.'),
      };
    }

    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.warn('Sign out failed:', error.message);
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setEmailVerified(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }

    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        loading,
        emailVerified,
        signUp,
        signIn,
        signOut,
        updateProfile,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
