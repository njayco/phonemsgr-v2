import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_USER, type UserProfile } from './mock-data';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (username: string) => Promise<void>;
  signUp: (username: string, displayName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('phone_msgr_user').then((stored) => {
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const signIn = async (username: string) => {
    const u = { ...CURRENT_USER, username };
    setUser(u);
    await AsyncStorage.setItem('phone_msgr_user', JSON.stringify(u));
  };

  const signUp = async (username: string, displayName: string, _phone: string) => {
    const u: UserProfile = {
      ...CURRENT_USER,
      username,
      displayName,
      kindnessScore: 0,
      reputationLevel: 1,
      plan: 'temp',
      connections: 0,
      messagesCount: 0,
      eventsCount: 0,
      monthlyRevenue: 0,
    };
    setUser(u);
    await AsyncStorage.setItem('phone_msgr_user', JSON.stringify(u));
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem('phone_msgr_user');
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      AsyncStorage.setItem('phone_msgr_user', JSON.stringify(updated));
    }
  };

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateUser,
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
