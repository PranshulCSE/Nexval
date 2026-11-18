import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, UserProfile } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Pre-configured seed users for Phase 0 demo & evaluation
export const SEED_DEMO_USERS: Record<string, UserProfile & { password: string }> = {
  'admin@nexhack.com': {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Chief Admin',
    email: 'admin@nexhack.com',
    role: 'admin',
    password: 'password123',
  },
  'judge1@nexhack.com': {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Dr. Sarah Verma',
    email: 'judge1@nexhack.com',
    role: 'judge',
    password: 'password123',
  },
  'judge2@nexhack.com': {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Prof. Rajesh Kumar',
    email: 'judge2@nexhack.com',
    role: 'judge',
    password: 'password123',
  },
  'judge3@nexhack.com': {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Ananya Sharma (Tech Lead)',
    email: 'judge3@nexhack.com',
    role: 'judge',
    password: 'password123',
  },
  'mentor@nexhack.com': {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Dr. Vikram Malhotra (Mentor)',
    email: 'mentor@nexhack.com',
    role: 'mentor',
    password: 'password123',
  },
};


interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loginAsDemo: (email: keyof typeof SEED_DEMO_USERS) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);

  // Fetch profile from Supabase profiles table
  const fetchProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Could not fetch user profile:', error.message);
        // Fallback profile if record does not yet exist
        if (userEmail && SEED_DEMO_USERS[userEmail]) {
          return SEED_DEMO_USERS[userEmail];
        }
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check for stored demo session in localStorage
    const savedDemoUser = localStorage.getItem('nexhack_demo_user');
    if (savedDemoUser) {
      try {
        const parsed = JSON.parse(savedDemoUser);
        if (parsed && parsed.email && SEED_DEMO_USERS[parsed.email]) {
          const demoProfile = SEED_DEMO_USERS[parsed.email];
          setProfile(demoProfile);
          setUser({
            id: demoProfile.id,
            email: demoProfile.email,
            app_metadata: {},
            user_metadata: { name: demoProfile.name, role: demoProfile.role },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as User);
          setIsDemoMode(true);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('nexhack_demo_user');
      }
    }

    if (!isSupabaseConfigured) {
      setIsDemoMode(true);
      setIsLoading(false);
      return;
    }

    // Initialize Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const prof = await fetchProfile(session.user.id, session.user.email);
        if (mounted) setProfile(prof);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const prof = await fetchProfile(session.user.id, session.user.email);
        if (mounted) setProfile(prof);
      } else {
        if (!localStorage.getItem('nexhack_demo_user')) {
          setProfile(null);
        }
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    setIsLoading(true);

    // Check if email matches seed demo accounts
    const normalizedEmail = email.trim().toLowerCase();
    const demoAccount = SEED_DEMO_USERS[normalizedEmail];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          // If Supabase failed but matches demo credentials in development, allow demo fallback
          if (demoAccount && password === demoAccount.password) {
            loginAsDemo(normalizedEmail);
            setIsLoading(false);
            return { error: null };
          }
          setIsLoading(false);
          return { error };
        }

        if (data.user) {
          localStorage.removeItem('nexhack_demo_user');
          setIsDemoMode(false);
          setUser(data.user);
          const prof = await fetchProfile(data.user.id, data.user.email);
          setProfile(prof || (demoAccount ? demoAccount : null));
        }

        setIsLoading(false);
        return { error: null };
      } catch (err: any) {
        setIsLoading(false);
        return { error: err };
      }
    } else {
      // Offline / Demo mode
      if (demoAccount && (password === demoAccount.password || password === 'password123')) {
        loginAsDemo(normalizedEmail);
        setIsLoading(false);
        return { error: null };
      } else {
        setIsLoading(false);
        return { error: new Error('Invalid email or password. Use seed credentials (e.g. password123)') };
      }
    }
  };

  const loginAsDemo = async (email: keyof typeof SEED_DEMO_USERS) => {
    const demoProfile = SEED_DEMO_USERS[email];
    if (!demoProfile) return;

    localStorage.setItem('nexhack_demo_user', JSON.stringify(demoProfile));
    setIsDemoMode(true);
    setProfile(demoProfile);
    setUser({
      id: demoProfile.id,
      email: demoProfile.email,
      app_metadata: {},
      user_metadata: { name: demoProfile.name, role: demoProfile.role },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User);
  };

  const signOut = async () => {
    setIsLoading(true);
    localStorage.removeItem('nexhack_demo_user');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Error signing out of Supabase:', e);
      }
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isDemoMode,
        signIn,
        signOut,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
