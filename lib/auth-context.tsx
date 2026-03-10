import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { apiRequest, getQueryFn, queryClient } from '@/lib/query-client';
import { useQuery } from '@tanstack/react-query';
import { disconnectWebSocket } from '@/lib/websocket';
import { setCacheUserId, cacheClearForUser } from '@/lib/local-cache';
import { router } from 'expo-router';

export interface EducationEntry {
  id: string;
  type: string;
  schoolName: string;
  degree: string;
  major: string;
  graduationYear: number | null;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  kindnessScore: number;
  reputationLevel: number;
  plan: 'temp' | 'associate' | 'executive';
  isOnline: boolean;
  badges: string[];
  connections: number;
  messagesCount: number;
  eventsCount: number;
  interests: string[];
  monthlyRevenue: number;
  inboxPrice: number;
  phone?: string;
  occupation?: string;
  company?: string;
  bio?: string;
  link?: string;
  education?: EducationEntry[];
}

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, displayName: string, phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery<UserProfile | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    setCacheUserId(user?.id ?? null);
  }, [user?.id]);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await apiRequest('POST', '/api/auth/login', { username, password });
    const data = await res.json();
    setCacheUserId(data.id);
    queryClient.setQueryData(['/api/auth/me'], data);
  }, []);

  const signUp = useCallback(async (username: string, displayName: string, phone: string, password: string) => {
    const res = await apiRequest('POST', '/api/auth/register', {
      username,
      password,
      displayName,
      phone,
    });
    const data = await res.json();
    queryClient.setQueryData(['/api/auth/me'], data);
  }, []);

  const signOut = useCallback(async () => {
    disconnectWebSocket();
    queryClient.cancelQueries();
    setCacheUserId(null);
    queryClient.setQueryData(['/api/auth/me'], null);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== '/api/auth/me' });
    router.replace('/');
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch {
    }
  }, []);

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    queryClient.setQueryData(['/api/auth/me'], (old: UserProfile | null) => {
      if (!old) return old;
      return { ...old, ...updates };
    });
  }, []);

  const refetchUser = useCallback(() => {
    refetch();
  }, [refetch]);

  const value = useMemo(() => ({
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateUser,
    refetchUser,
  }), [user, isLoading, signIn, signUp, signOut, updateUser, refetchUser]);

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
