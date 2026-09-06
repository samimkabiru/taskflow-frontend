"use client";

import { api } from "@/lib/apiClient";
import type { Board, BoardMember, PendingInvite, BoardRole, BoardDto, BoardMemberDto, BoardInviteDto } from "@/lib/types";

export interface CreateBoardInput {
  name: string;
  description?: string;
  accentColor: string;
  taskPrefix: string;
}

export interface UpdateBoardInput {
  name?: string;
  description?: string;
  accentColor?: string;
  taskPrefix?: string;
}

export interface InviteMemberInput {
  email: string;
  role: BoardRole;
}

// ─── DTO Converters ──────────────────────────────────────────────────────────

export function mapBoardDto(dto: BoardDto): Board {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || "",
    accentColor: dto.accentColor,
    taskPrefix: dto.taskPrefix,
    ownerId: dto.ownerId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function mapMemberDto(dto: BoardMemberDto): BoardMember {
  return {
    id: dto.id,
    boardId: "", // Will be filled or managed in state
    userId: dto.userId,
    role: dto.role,
    joinedAt: dto.joinedAt,
    user: {
      id: dto.userId,
      fullName: dto.userFullName,
      email: dto.userEmail,
      createdAt: dto.joinedAt,
    },
  };
}

export function mapInviteDto(dto: BoardInviteDto): PendingInvite {
  return {
    id: dto.id,
    boardId: dto.boardId,
    email: dto.email,
    role: (dto.role as BoardRole) || "MEMBER",
    invitedAt: dto.createdAt,
    invitedBy: "Admin",
  };
}

// ─── Board REST Endpoints ───────────────────────────────────────────────────

export async function getBoards(): Promise<Board[]> {
  const dtos = await api.get<BoardDto[]>("/boards");
  return dtos.map(mapBoardDto);
}

export async function getBoard(boardId: string): Promise<Board> {
  const dto = await api.get<BoardDto>(`/boards/${boardId}`);
  return mapBoardDto(dto);
}

export async function createBoard(data: CreateBoardInput): Promise<Board> {
  const dto = await api.post<BoardDto>("/boards", {
    name: data.name,
    description: data.description || "",
    accentColor: data.accentColor,
    taskPrefix: data.taskPrefix.toUpperCase(),
  });
  return mapBoardDto(dto);
}

export async function updateBoard(boardId: string, updates: UpdateBoardInput): Promise<Board> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.accentColor !== undefined) payload.accentColor = updates.accentColor;
  if (updates.taskPrefix !== undefined) payload.taskPrefix = updates.taskPrefix.toUpperCase();

  const dto = await api.patch<BoardDto>(`/boards/${boardId}`, payload);
  return mapBoardDto(dto);
}

export async function deleteBoard(boardId: string): Promise<void> {
  await api.delete<void>(`/boards/${boardId}`);
}

// ─── Board Membership Endpoints ─────────────────────────────────────────────

export async function getBoardMembers(boardId: string): Promise<BoardMember[]> {
  const dtos = await api.get<BoardMemberDto[]>(`/boards/${boardId}/members`);
  return dtos.map((d) => {
    const member = mapMemberDto(d);
    member.boardId = boardId;
    return member;
  });
}

export async function getPendingInvites(boardId: string): Promise<PendingInvite[]> {
  const dtos = await api.get<BoardInviteDto[]>(`/boards/${boardId}/invites/pending`);
  return dtos.map(mapInviteDto);
}

export async function inviteMember(boardId: string, data: InviteMemberInput): Promise<PendingInvite> {
  const dto = await api.post<BoardInviteDto>(`/boards/${boardId}/invites`, {
    email: data.email,
    role: data.role,
  });
  return mapInviteDto(dto);
}

export async function acceptBoardInvite(inviteId: string): Promise<BoardMember> {
  const dto = await api.post<BoardMemberDto>(`/boards/invites/${inviteId}/accept`);
  return mapMemberDto(dto);
}

export async function declineBoardInvite(inviteId: string): Promise<void> {
  await api.post<void>(`/boards/invites/${inviteId}/decline`);
}

export async function revokePendingInvite(inviteId: string): Promise<void> {
  await api.delete<void>(`/boards/invites/${inviteId}`);
}

export async function updateMemberRole(boardId: string, userId: string, role: BoardRole): Promise<BoardMember> {
  const dto = await api.patch<BoardMemberDto>(`/boards/${boardId}/members/${userId}`, { role });
  const member = mapMemberDto(dto);
  member.boardId = boardId;
  return member;
}

export async function removeMember(boardId: string, userId: string): Promise<void> {
  await api.delete<void>(`/boards/${boardId}/members/${userId}`);
}

export async function leaveBoard(boardId: string): Promise<void> {
  await api.delete<void>(`/boards/${boardId}/leave`);
}
