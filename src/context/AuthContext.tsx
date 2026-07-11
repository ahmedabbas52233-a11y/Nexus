import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType, LoginResult } from '../types';
import { authAPI, profileAPI } from '../services/api';
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

  const applySession = (data: { token: string; user: User }) => {
    setUser(data.user);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  };

  const login = async (email: string, password: string, role: UserRole): Promise<LoginResult> => {
    setIsLoading(true);
    
    try {
      const data = await authAPI.login({ email, password });

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      // 2FA is enabled on this account - a verification code was emailed.
      // Caller (LoginPage) is responsible for prompting for the OTP and
      // calling verifyOtp() to complete the login.
      if (data.requiresOtp) {
        setIsLoading(false);
        return { requiresOtp: true, userId: data.userId };
      }

      if (data.user.role !== role) {
        throw new Error(`This account is registered as a ${data.user.role}, not ${role}`);
      }

      applySession(data);
      toast.success('Successfully logged in!');
      return { requiresOtp: false };
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (userId: number, otp: string): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await authAPI.verifyLoginOtp(userId, otp);
      if (!data.success) {
        throw new Error(data.message || 'Verification failed');
      }
      applySession(data);
      toast.success('Successfully logged in!');
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
        applySession(data);
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

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      const data = await authAPI.forgotPassword(email);
      toast.success(data.message || 'If that email exists, a reset link has been sent');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      const data = await authAPI.resetPassword(token, newPassword);
      if (!data.success) {
        throw new Error(data.message || 'Reset failed');
      }
      toast.success('Password reset successfully. Please log in.');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const toggleTwoFactor = async (enabled: boolean): Promise<void> => {
    try {
      const data = await authAPI.toggle2FA(enabled);
      if (!data.success) {
        throw new Error(data.message || 'Failed to update 2FA setting');
      }
      setUser((prev) => (prev ? { ...prev, twoFactorEnabled: enabled } : prev));
      toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const updateProfile = async (_userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const data = await profileAPI.updateProfile(updates as Record<string, unknown>);
      if (!data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }
      setUser((prev) => {
        const next = prev ? { ...prev, ...updates } : prev;
        if (next) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
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
    verifyOtp,
    register,
    logout,
    forgotPassword,
    resetPassword,
    toggleTwoFactor,
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
