import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/api';
import { api } from '@/lib/api';
import {
  createMagicSessionUser,
  isMagicCredentials,
  isMagicToken,
  makeMagicToken,
  MAGIC_USER_STORAGE_KEY,
} from '@/lib/auth-magic-bypass';

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
        if (storedToken && isMagicToken(storedToken)) {
          setToken(storedToken);
          const raw = localStorage.getItem(MAGIC_USER_STORAGE_KEY);
          if (raw) {
            setUser(JSON.parse(raw) as User);
          } else {
            setUser(createMagicSessionUser());
          }
          return;
        }
        if (storedToken) {
          setToken(storedToken);
          // Verify token is still valid by fetching current user
          const response = await api.getProfile();
          if (response.data) {
            setUser(response.data);
          }
        }
      } catch {
        localStorage.removeItem('remquip_auth_token');
        localStorage.removeItem(MAGIC_USER_STORAGE_KEY);
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
      const response = await api.login(email, password);
      
      if (response.data?.token && response.data?.user) {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('remquip_auth_token', response.data.token);
        return response.data.user;
      }
      throw new Error('Invalid login response');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.logout();
    } catch {
      // Still clear local state even if API call fails
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('remquip_auth_token');
      setIsLoading(false);
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
        return response.data.user;
      }
      throw new Error('Invalid registration response');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<User> => {
    setError(null);
    try {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await api.updateUser(user.id, data);
      
      if (response.data) {
        setUser(response.data);
        return response.data;
      }
      throw new Error('Invalid update response');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
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
