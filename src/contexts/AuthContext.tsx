import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { enqueueSyncAction } from '@/lib/offlineSync';

const PROFILE_CACHE_KEY = 'gradex_cached_profile';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  level: string;
  semester: string;
  department?: string;
  faculty?: string;
  institution?: string;
  matric_no?: string;
  about?: string;
  avatar_url?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (name: string, email: string, password: string, institution: string, faculty: string, department: string, matric_no: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    // Immediately load from cache
    const cachedData = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cachedData) {
      setUser(JSON.parse(cachedData));
    }

    if (!navigator.onLine) {
        return; // rely strictly on cache
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      const profileData = profile as any;

      const newProfile = {
        id: profileData.id,
        email: profileData.email || '',
        name: profileData.name,
        level: profileData.level || '100L',
        semester: profileData.semester || '1st',
        department: profileData.department || '',
        faculty: profileData.faculty || '',
        institution: profileData.institution || '',
        matric_no: profileData.matric_no || '',
        about: profileData.about || '',
        avatar_url: profileData.avatar_url || '',
        isAdmin: !!roleData,
      };
      
      setUser(newProfile);
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(newProfile));
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer profile fetch with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (name: string, email: string, password: string, institution: string, faculty: string, department: string, matric_no: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          level: '100L', // Default to 100L
          semester: '1st', // Default to 1st
          department,
          faculty,
          institution,
          matric_no,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'This email is already registered. Please login instead.' };
      }
      return { error: error.message };
    }

    return { error: null };
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Invalid email or password. Please try again.' };
      }
      return { error: error.message };
    }

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!session?.user) return;

    // Optimistic Update & Cache
    if (user) {
        const next = { ...user, ...updates };
        setUser(next);
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(next));
    }

    if (!navigator.onLine) {
        enqueueSyncAction({ type: 'UPDATE_PROFILE', payload: updates });
        return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        level: updates.level,
        semester: updates.semester,
        about: updates.about,
        institution: updates.institution,
        faculty: updates.faculty,
        department: updates.department,
        matric_no: updates.matric_no,
        avatar_url: updates.avatar_url,
      })
      .eq('id', session.user.id);
      
      // If error, normally we would rollback, but ignoring for basic optimistic implementation.
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout, updateProfile, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}