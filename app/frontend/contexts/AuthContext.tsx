"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { auth, onAuthChange, logout as firebaseLogout, loginWithEmail, registerWithEmail } from "@/lib/firebase";
import apiClient from "@/services/apiClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Store token for API calls
        const token = await firebaseUser.getIdToken();
        localStorage.setItem("authToken", token);
      } else {
        localStorage.removeItem("authToken");
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Try Firebase direct auth first
      const result = await loginWithEmail(email, password);
      const token = await result.user.getIdToken();
      localStorage.setItem("authToken", token);
    } catch (firebaseError: any) {
      // If Firebase direct auth fails, try backend auth
      try {
        const response = await apiClient.post("/api/v1/auth/login", {
          email,
          password
        });
        
        if (response.data.custom_token) {
          // Sign in with custom token from backend
          const { signInWithToken } = await import("@/lib/firebase");
          await signInWithToken(response.data.custom_token);
        } else {
          throw new Error(response.data.message || "Login failed");
        }
      } catch (backendError: any) {
        throw new Error(
          backendError.response?.data?.detail || 
          firebaseError.message || 
          "Login failed"
        );
      }
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      // Register via backend first (creates user in Firebase + Firestore)
      const response = await apiClient.post("/api/v1/auth/register", {
        email,
        password,
        display_name: displayName
      });
      
      if (response.data.success && response.data.custom_token) {
        // Sign in with custom token
        const { signInWithToken } = await import("@/lib/firebase");
        await signInWithToken(response.data.custom_token);
      } else {
        // Fallback: try Firebase direct registration
        const result = await registerWithEmail(email, password);
        const token = await result.user.getIdToken();
        localStorage.setItem("authToken", token);
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.detail || 
        error.message || 
        "Registration failed"
      );
    }
  };

  const logout = async () => {
    try {
      // Logout from backend (revokes tokens)
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          await apiClient.post("/api/v1/auth/logout");
        } catch (e) {
          // Ignore backend logout errors
        }
      }
      
      // Logout from Firebase
      await firebaseLogout();
      localStorage.removeItem("authToken");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("authToken");
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (user) {
      return user.getIdToken();
    }
    return localStorage.getItem("authToken");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
