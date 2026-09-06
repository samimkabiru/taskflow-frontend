"use client";

import { api, API_BASE_URL } from "@/lib/apiClient";
import { getBoardMembers } from "./boardService";
import type { User, UserDto } from "@/lib/types";

export interface UpdateUserProfileInput {
  fullName: string;
}

/**
 * Gets assignable users for a specific board from real board membership
 */
export async function getUsersForBoard(boardId: string): Promise<User[]> {
  const members = await getBoardMembers(boardId);
  return members.map((m) => m.user);
}

/**
 * Legacy sync fallback (returns empty array; components should pass board members)
 */
export function getAllUsers(): User[] {
  return [];
}

/**
 * Returns direct URL to fetch raw user avatar from backend GET /users/{userId}/avatar
 */
export function getUserAvatarUrl(userId?: string | null, cacheBuster?: string | number): string | undefined {
  if (!userId) return undefined;
  const baseUrl = `${API_BASE_URL}/users/${encodeURIComponent(userId)}/avatar`;
  return cacheBuster ? `${baseUrl}?t=${cacheBuster}` : baseUrl;
}

/**
 * PATCH /users/me - updates the current user's display name
 */
export async function updateUserProfile(data: UpdateUserProfileInput): Promise<UserDto | User> {
  return await api.patch<UserDto | User>("/users/me", data);
}

/**
 * POST /users/me/avatar - multipart upload with field name 'file'
 */
export async function uploadUserAvatar(file: File): Promise<UserDto | User> {
  const formData = new FormData();
  formData.append("file", file);
  return await api.upload<UserDto | User>("/users/me/avatar", formData);
}

/**
 * DELETE /users/me - permanently deletes (anonymizes) the user account
 */
export async function deleteUserAccount(): Promise<void> {
  await api.delete<void>("/users/me");
}
