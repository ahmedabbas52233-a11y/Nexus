import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

/* eslint-disable react-refresh/only-export-components */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'business_nexus_user';
const TOKEN_STORAGE_KEY = 'business_nexus_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      
      if (token && storedUser) {
        try {
          const data = await authAPI.getMe();
          if (data.success) {
            setUser(data.user);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        } catch {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    
    try {
      const data = await authAPI.login({ email, password });
      
      if (data.success) {
        if (data.user.role !== role) {
          throw new Error(`This account is registered as a ${data.user.role}, not ${role}`);
        }
        
        setUser(data.user);
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        toast.success('Successfully logged in!');
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    
    try {
      const data = await authAPI.register({ name, email, password, role });
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        toast.success('Account created successfully!');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (_email: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password reset instructions sent to your email (mock)');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const resetPassword = async (_token: string, _newPassword: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password reset successfully (mock)');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const updateProfile = async (_userId: string, updates: Partial<User>): Promise<void> => {
    try {
      setUser(prev => prev ? { ...prev, ...updates } : null);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, ...updates }));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const logout = (): void => {
    authAPI.logout().catch(() => {});
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
