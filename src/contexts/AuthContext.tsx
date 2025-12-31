import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  getCurrentUser,
  getUserProfile,
  onAuthStateChange,
  type UserProfileNew
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  profile: UserProfileNew | null;
  session: Session | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileNew | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      console.log('AuthContext: Current user:', currentUser);
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await getUserProfile(currentUser.id);
        console.log('AuthContext: User profile:', userProfile);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await getUserProfile(user.id);
      setProfile(userProfile);
    }
  };

  useEffect(() => {
    // Initial load
    loadUser();

    // Listen to auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      console.log('AuthContext: Auth state change:', event, newSession?.user?.id);
      setSession(newSession);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Small delay to ensure profile creation has completed
        setTimeout(async () => {
          await loadUser();
        }, 1000);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, refreshProfile }}>
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

