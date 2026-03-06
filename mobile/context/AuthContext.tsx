import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface User {
  id: string;
  name: string;
  email: string;
  photo?: string;
  accessToken: string;
  idToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (userData: User) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'user_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved user data on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
        const currentUser = GoogleSignin.getCurrentUser();
        if (savedUser && currentUser) {
          // Both local data and Google session exist -> restore user
          setUser(JSON.parse(savedUser));
        } else if (savedUser && !currentUser) {
          // Stale local data (signed out elsewhere) -> clear it
          await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const signIn = async (userData: User) => {
    try {
      await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      // return null silently if no user is signed in
      if (!user) return null;
      const tokens = await GoogleSignin.getTokens();
      
      // Update stored tokens if user is signed in
      if (user) {
        const updatedUser = { 
          ...user, 
          accessToken: tokens.accessToken, 
          idToken: tokens.idToken 
        };
        await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      return tokens.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, getAccessToken }}>
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
