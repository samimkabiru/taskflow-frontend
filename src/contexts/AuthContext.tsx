"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, BoardRole } from "@/lib/types";
import { loginUser, registerUser, logoutUser, refreshSession, changeUserPassword, getStoredSessionUser, saveSessionUser, loginWithGoogle as loginWithGoogleService } from "@/services/authService";
import { deleteUserAccount } from "@/services/userService";
import { onAuthFailure, getAccessToken } from "@/lib/apiClient";
import { decodeJwtPayload } from "@/lib/jwt";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  deleteAccount: () => Promise<void>;
  getUserBoardRole: (boardId: string) => BoardRole | null;
  setUserBoardRole: (boardId: string, role: BoardRole | null) => void;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [boardRoles, setBoardRoles] = useState<Record<string, BoardRole>>({});
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tf_board_roles");
      if (saved) setBoardRoles(JSON.parse(saved));
    } catch {}
  }, []);

  // Handle automatic 401 unrecoverable failures
  useEffect(() => {
    const unsubscribe = onAuthFailure(() => {
      setUser(null);
      setBoardRoles({});
      if (typeof window !== "undefined") {
        localStorage.removeItem("tf_board_roles");
        localStorage.removeItem("tf_user");
        localStorage.removeItem("tf_access_token");
        sessionStorage.removeItem("tf_user");
        sessionStorage.removeItem("tf_access_token");
      }
    });
    return unsubscribe;
  }, []);

  // Silent session restore on mount via POST /auth/refresh with safety timeout
  useEffect(() => {
    let isMounted = true;
    let safetyTimer: NodeJS.Timeout | null = null;

    async function restoreAuth() {
      // 1. If we already have a valid active token and cached user, reuse without hitting backend!
      const currentToken = getAccessToken();
      const cachedUser = getStoredSessionUser();

      if (currentToken) {
        const decoded = decodeJwtPayload(currentToken);
        if (decoded?.exp && decoded.exp * 1000 > Date.now() + 30000) {
          if (isMounted) {
            if (cachedUser) setUser(cachedUser);
            setIsLoading(false);
          }
          return;
        }
      }

      // 2. Set an uncompromised fallback timeout so the app is NEVER stuck on "Checking session..."
      safetyTimer = setTimeout(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      }, 7500);

      // 3. Request fresh session from backend with 7-second timeout
      try {
        const result = await refreshSession(7000);
        if (isMounted && result) {
          setUser(result.user);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (safetyTimer) clearTimeout(safetyTimer);
        if (isMounted) setIsLoading(false);
      }
    }

    restoreAuth();

    return () => {
      isMounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginUser({ email, password });
    setUser(result.user);
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const result = await registerUser({ fullName, email, password });
    setUser(result.user);
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await loginWithGoogleService(idToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setBoardRoles({});
      if (typeof window !== "undefined") {
        localStorage.removeItem("tf_board_roles");
      }
      router.push("/login");
    }
  }, [router]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      await changeUserPassword({ oldPassword, newPassword });
    } finally {
      setUser(null);
      setBoardRoles({});
      if (typeof window !== "undefined") {
        localStorage.removeItem("tf_board_roles");
      }
      router.push("/login");
    }
  }, [router]);

  const updateCurrentUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      saveSessionUser(updated);
      return updated;
    });
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteUserAccount();
    setUser(null);
    setBoardRoles({});
    if (typeof window !== "undefined") {
      localStorage.removeItem("tf_board_roles");
      localStorage.removeItem("tf_user");
      localStorage.removeItem("tf_access_token");
      sessionStorage.removeItem("tf_user");
      sessionStorage.removeItem("tf_access_token");
    }
    router.push("/login");
  }, [router]);

  const getUserBoardRole = useCallback(
    (boardId: string): BoardRole | null => {
      return boardRoles[boardId] || null;
    },
    [boardRoles]
  );

  const setUserBoardRole = useCallback((boardId: string, role: BoardRole | null) => {
    setBoardRoles((prev) => {
      let next: Record<string, BoardRole>;
      if (!role) {
        next = { ...prev };
        delete next[boardId];
      } else {
        next = { ...prev, [boardId]: role };
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("tf_board_roles", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        changePassword,
        updateCurrentUser,
        deleteAccount,
        getUserBoardRole,
        setUserBoardRole,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
