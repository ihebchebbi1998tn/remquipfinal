import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/api';
import { api } from '@/lib/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<User>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('remquip_auth_token');
        if (storedToken) {
          setToken(storedToken);
          console.log('[v0] Token found in storage, attempting to verify');
          // Verify token is still valid by fetching current user
          const response = await api.getProfile();
          if (response.data) {
            setUser(response.data);
            console.log('[v0] User verified:', response.data.email);
          }
        }
      } catch (err) {
        console.log('[v0] Token verification failed, clearing session');
        localStorage.removeItem('remquip_auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[v0] Login attempt for:', email);
      const response = await api.login(email, password);
      
      if (response.data?.token && response.data?.user) {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('remquip_auth_token', response.data.token);
        console.log('[v0] Login successful for:', response.data.user.email);
        return response.data.user;
      }
      throw new Error('Invalid login response');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      console.error('[v0] Login failed:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[v0] Logout initiated');
      await api.logout();
    } catch (err) {
      console.error('[v0] Logout API call failed:', err);
      // Still clear local state even if API call fails
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('remquip_auth_token');
      setIsLoading(false);
      console.log('[v0] Logout complete');
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    full_name: string,
    phone?: string
  ): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[v0] Registration attempt for:', email);
      const response = await api.register({
        email,
        password,
        full_name,
        phone,
      });

      if (response.data?.token && response.data?.user) {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('remquip_auth_token', response.data.token);
        console.log('[v0] Registration successful for:', response.data.user.email);
        return response.data.user;
      }
      throw new Error('Invalid registration response');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      console.error('[v0] Registration failed:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<User> => {
    setError(null);
    try {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('[v0] Updating profile');
      const response = await api.updateUser(user.id, data);
      
      if (response.data) {
        setUser(response.data);
        console.log('[v0] Profile updated successfully');
        return response.data;
      }
      throw new Error('Invalid update response');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      console.error('[v0] Profile update failed:', errorMessage);
      throw err;
    }
  }, [user?.id]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    register,
    updateProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
