"use client";

import { useState, useEffect, useCallback } from 'react';
import { AuthService, AuthUser, SignInCredentials, SignUpData, UpdateProfileData } from '@/lib/auth-service';
import { supabase } from '@/lib/supabase-client';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (credentials: SignInCredentials) => Promise<boolean>;
  signUp: (userData: SignUpData) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  updateProfile: (updates: UpdateProfileData) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await AuthService.getCurrentUser();
      if (result.success) {
        setUser(result.data || null);
      } else {
        setError(result.error || 'Failed to get user');
        setUser(null);
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (credentials: SignInCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.signIn(credentials);
      if (result.success && result.data) {
        setUser(result.data);
        return true;
      } else {
        setError(result.error || 'Failed to sign in');
        return false;
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (userData: SignUpData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.signUp(userData);
      if (result.success && result.data) {
        setUser(result.data);
        return true;
      } else {
        setError(result.error || 'Failed to sign up');
        return false;
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.signOut();
      if (result.success) {
        setUser(null);
        return true;
      } else {
        setError(result.error || 'Failed to sign out');
        return false;
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: UpdateProfileData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.updateProfile(updates);
      if (result.success && result.data) {
        setUser(result.data);
        return true;
      } else {
        setError(result.error || 'Failed to update profile');
        return false;
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.resetPassword(email);
      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Failed to reset password');
        return false;
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const transformedUser = AuthService.transformUser(session.user);
          setUser(transformedUser);
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setError(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const transformedUser = AuthService.transformUser(session.user);
          setUser(transformedUser);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    clearError,
    refreshUser
  };
}
