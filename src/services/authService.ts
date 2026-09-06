"use client";

import { api, setAccessToken, getAccessToken } from "@/lib/apiClient";
import { decodeJwtPayload } from "@/lib/jwt";
import type { User, AuthResponse } from "@/lib/types";

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

const USER_SESSION_KEY = "tf_user";

export function saveSessionUser(user: User | null): void {
  if (typeof window !== "undefined") {
    try {
      if (user) {
        sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(USER_SESSION_KEY);
      }
    } catch {}
  }
}

export function getStoredSessionUser(): User | null {
  if (typeof window !== "undefined") {
    try {
      const json = sessionStorage.getItem(USER_SESSION_KEY);
      return json ? (JSON.parse(json) as User) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Maps AuthResponse (UserDto + accessToken) to a client User entity with `id` from JWT `sub`
 */
export function mapAuthResponseToUser(response: AuthResponse): User {
  const decoded = decodeJwtPayload(response.accessToken);
  const existingUser = getStoredSessionUser();
  return {
    id: decoded?.sub || "user",
    fullName: response.user.fullName,
    email: response.user.email,
    avatarUrl: response.user.avatarUrl,
    avatarUpdatedAt: existingUser?.avatarUpdatedAt,
    createdAt: new Date().toISOString(),
  };
}

/**
 * POST /auth/register
 */
export async function registerUser(data: RegisterRequest): Promise<{ user: User; accessToken: string }> {
  const response = await api.post<AuthResponse>("/auth/register", data, { skipAuth: true });
  setAccessToken(response.accessToken);
  const user = mapAuthResponseToUser(response);
  saveSessionUser(user);
  return { user, accessToken: response.accessToken };
}

/**
 * POST /auth/login
 */
export async function loginUser(data: LoginRequest): Promise<{ user: User; accessToken: string }> {
  const response = await api.post<AuthResponse>("/auth/login", data, { skipAuth: true });
  setAccessToken(response.accessToken);
  const user = mapAuthResponseToUser(response);
  saveSessionUser(user);
  return { user, accessToken: response.accessToken };
}

/**
 * POST /auth/google
 */
export async function loginWithGoogle(idToken: string): Promise<{ user: User; accessToken: string }> {
  const response = await api.post<AuthResponse>("/auth/google", { idToken }, { skipAuth: true });
  setAccessToken(response.accessToken);
  const user = mapAuthResponseToUser(response);
  saveSessionUser(user);
  return { user, accessToken: response.accessToken };
}

/**
 * POST /auth/refresh (using HttpOnly cookie)
 * Checks for existing valid access token in sessionStorage first to avoid
 * unnecessary refresh token rotation and race conditions on rapid reloads.
 */
export async function refreshSession(): Promise<{ user: User; accessToken: string } | null> {
  // 1. If we already have a valid active token and cached user in sessionStorage, reuse it
  const existingToken = getAccessToken();
  const cachedUser = getStoredSessionUser();
  if (existingToken && cachedUser) {
    const decoded = decodeJwtPayload(existingToken);
    // If token has at least 30 seconds before expiring, reuse it safely
    if (decoded?.exp && decoded.exp * 1000 > Date.now() + 30000) {
      return { user: cachedUser, accessToken: existingToken };
    }
  }

  // 2. Otherwise request fresh tokens from backend /auth/refresh using HttpOnly cookie
  try {
    const response = await api.post<AuthResponse>("/auth/refresh", undefined, { skipAuth: true });
    setAccessToken(response.accessToken);
    const user = mapAuthResponseToUser(response);
    saveSessionUser(user);
    return { user, accessToken: response.accessToken };
  } catch {
    setAccessToken(null);
    saveSessionUser(null);
    return null;
  }
}

/**
 * POST /auth/logout
 */
export async function logoutUser(): Promise<void> {
  try {
    await api.post<void>("/auth/logout", undefined, { skipAuth: true });
  } finally {
    setAccessToken(null);
    saveSessionUser(null);
  }
}

/**
 * POST /auth/change-password
 * Revokes all refresh tokens and logs out user immediately per §2
 */
export async function changeUserPassword(data: ChangePasswordRequest): Promise<void> {
  try {
    await api.post<void>("/auth/change-password", data);
  } finally {
    setAccessToken(null);
    saveSessionUser(null);
  }
}
