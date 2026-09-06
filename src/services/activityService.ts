"use client";

import { api } from "@/lib/apiClient";
import type { ActivityEntry, ActivityLogDto, ActivityAction, SpringPage } from "@/lib/types";

export function mapActivityDto(dto: ActivityLogDto): ActivityEntry {
  const meta = (dto.metadata as Record<string, unknown>) || {};
  const boardName = (meta.board_name as string) || (meta.boardName as string);
  const taskTitle = (meta.task_title as string) || (meta.taskTitle as string) || (meta.title as string);
  const shortCode = (meta.short_code as string) || (meta.shortCode as string);
  const listName = (meta.new_title as string) || (meta.newTitle as string) || (meta.list_title as string) || (meta.listTitle as string) || (meta.list_name as string) || (meta.listName as string);
  const userName = (meta.assignee_name as string) || (meta.assigneeName as string) || (meta.invited_name as string) || (meta.invitedName as string) || (meta.removed_name as string) || (meta.removedName as string) || (meta.user_name as string) || (meta.userName as string) || (meta.member_name as string) || (meta.memberName as string);
  const fileName = (meta.attachment_name as string) || (meta.attachmentName as string) || (meta.file_name as string) || (meta.fileName as string);
  const genericTarget = (meta.target_name as string) || (meta.targetName as string) || (meta.name as string);

  let targetName = "Item";
  if (dto.actionType.startsWith("BOARD_") && boardName) {
    targetName = boardName;
  } else if (dto.actionType.startsWith("LIST_") && listName) {
    targetName = listName;
  } else if (dto.actionType.startsWith("MEMBER_") && userName) {
    targetName = userName;
  } else if (dto.actionType.startsWith("ATTACHMENT_") && fileName) {
    targetName = fileName;
  } else if (taskTitle) {
    targetName = taskTitle;
  } else if (shortCode) {
    targetName = shortCode;
  } else if (boardName) {
    targetName = boardName;
  } else if (genericTarget) {
    targetName = genericTarget;
  }

  let targetType: 'TASK' | 'LIST' | 'BOARD' | 'MEMBER' | 'COMMENT' | 'ATTACHMENT' = "TASK";
  if (dto.actionType.startsWith("BOARD_")) {
    targetType = "BOARD";
  } else if (dto.actionType.startsWith("LIST_")) {
    targetType = "LIST";
  } else if (dto.actionType.startsWith("MEMBER_")) {
    targetType = "MEMBER";
  } else if (dto.actionType.startsWith("COMMENT_")) {
    targetType = "COMMENT";
  } else if (dto.actionType.startsWith("ATTACHMENT_")) {
    targetType = "ATTACHMENT";
  }

  return {
    id: dto.id,
    boardId: dto.boardId,
    action: dto.actionType as ActivityAction,
    actorId: dto.actorId,
    actor: {
      id: dto.actorId,
      fullName: dto.actorFullName || "Member",
      email: "",
      createdAt: dto.createdAt,
    },
    targetType,
    targetId: dto.taskId || dto.id,
    targetName,
    metadata: (meta as Record<string, string>) || {},
    createdAt: dto.createdAt,
  };
}

export async function getActivityForBoard(boardId: string, page = 0, size = 50): Promise<{ entries: ActivityEntry[]; totalPages: number; hasMore: boolean }> {
  const response = await api.get<SpringPage<ActivityLogDto>>(`/boards/${boardId}/activity?page=${page}&size=${size}&sort=createdAt,desc`);
  const entries = (response.content || []).map(mapActivityDto);
  return {
    entries,
    totalPages: response.totalPages,
    hasMore: response.number + 1 < response.totalPages,
  };
}

export async function getActivitiesForTask(taskId: string): Promise<ActivityEntry[]> {
  const dtos = await api.get<ActivityLogDto[]>(`/tasks/${taskId}/activity`);
  return (dtos || []).map(mapActivityDto);
}
