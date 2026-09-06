"use client";

import { api } from "@/lib/apiClient";
import type { TaskList, Task, Priority, TaskListDto, TaskDto, SpringPage, Label, User } from "@/lib/types";

export interface CreateTaskInput {
  listId: string;
  title: string;
  description?: string;
  dueDate?: string;
  assigneeId?: string;
  priority?: Priority | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  priority?: Priority | null;
  listId?: string;
}

export interface MoveTaskInput {
  taskId: string;
  taskListId: string;
  position: number;
}

// ─── DTO Converters ──────────────────────────────────────────────────────────

export function mapTaskListDto(dto: TaskListDto): TaskList {
  return {
    id: dto.id,
    boardId: dto.boardId,
    name: dto.title,
    position: dto.position,
    createdAt: dto.createdAt,
  };
}

export function mapTaskDto(dto: TaskDto): Task {
  const labels: Label[] = (dto.labels || []).map((l) => ({
    id: l.id,
    boardId: l.boardId,
    name: l.name,
    color: l.color,
  }));

  const validPriorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const upper = dto.priority ? (String(dto.priority).toUpperCase() as Priority) : null;
  const priority = upper && validPriorities.includes(upper) ? upper : null;

  const raw = dto as unknown as Record<string, unknown>;
  let assignee: User | undefined = undefined;
  if (raw.assignee && typeof raw.assignee === "object") {
    const a = raw.assignee as Record<string, unknown>;
    assignee = {
      id: (a.id as string) || (raw.assigneeId as string) || "",
      fullName: (a.fullName as string) || (a.name as string) || (raw.assigneeName as string) || "",
      email: (a.email as string) || "",
      avatarUrl: (a.avatarUrl as string) || (a.avatar_url as string) || undefined,
      createdAt: (a.createdAt as string) || (raw.createdAt as string) || new Date().toISOString(),
    };
  } else if (raw.assigneeName || raw.assignee_name || raw.assigneeFullName) {
    const name = (raw.assigneeName as string) || (raw.assignee_name as string) || (raw.assigneeFullName as string) || "";
    assignee = {
      id: (raw.assigneeId as string) || (raw.assignee_id as string) || "",
      fullName: name,
      email: (raw.assigneeEmail as string) || (raw.assignee_email as string) || "",
      avatarUrl: (raw.assigneeAvatarUrl as string) || (raw.assignee_avatar_url as string) || undefined,
      createdAt: (raw.createdAt as string) || new Date().toISOString(),
    };
  }

  const rawCommentCount =
    raw.commentCount ??
    raw.comment_count ??
    raw.commentsCount ??
    raw.comments_count ??
    (Array.isArray(raw.comments) ? raw.comments.length : undefined);
  const commentCount = typeof rawCommentCount === "number" ? rawCommentCount : 0;

  const rawAttachmentCount =
    raw.attachmentCount ??
    raw.attachment_count ??
    raw.attachmentsCount ??
    raw.attachments_count ??
    (Array.isArray(raw.attachments) ? raw.attachments.length : undefined);
  const attachmentCount = typeof rawAttachmentCount === "number" ? rawAttachmentCount : 0;

  return {
    id: dto.id,
    shortCode: dto.shortCode,
    title: dto.title,
    description: dto.description || "",
    priority,
    dueDate: dto.dueDate || undefined,
    assigneeId: dto.assigneeId || (raw.assignee_id as string) || assignee?.id || undefined,
    assignee,
    listId: dto.taskListId,
    boardId: dto.boardId,
    labelIds: labels.map((l) => l.id),
    labels,
    position: dto.position,
    commentCount,
    attachmentCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

// ─── Task List Endpoints ─────────────────────────────────────────────────────

export async function getTaskListsForBoard(boardId: string): Promise<TaskList[]> {
  const dtos = await api.get<TaskListDto[]>(`/boards/${boardId}/lists`);
  return dtos.map(mapTaskListDto).sort((a, b) => a.position - b.position);
}

export async function createTaskList(boardId: string, title: string): Promise<TaskList> {
  const dto = await api.post<TaskListDto>(`/boards/${boardId}/lists`, { title });
  return mapTaskListDto(dto);
}

export async function updateTaskList(listId: string, title: string): Promise<TaskList> {
  const dto = await api.patch<TaskListDto>(`/lists/${listId}`, { title });
  return mapTaskListDto(dto);
}

export async function deleteTaskList(listId: string): Promise<void> {
  await api.delete<void>(`/lists/${listId}`);
}

export async function reorderTaskList(listId: string, position: number): Promise<TaskList> {
  const dto = await api.patch<TaskListDto>(`/lists/${listId}/reorder`, { position });
  return mapTaskListDto(dto);
}

// ─── Task Endpoints ──────────────────────────────────────────────────────────

export async function getTasksForBoard(boardId: string, page = 0, size = 200): Promise<Task[]> {
  const response = await api.get<SpringPage<TaskDto>>(`/boards/${boardId}/tasks?page=${page}&size=${size}`);
  return (response.content || []).map(mapTaskDto);
}

export async function getTasksForList(listId: string): Promise<Task[]> {
  const dtos = await api.get<TaskDto[]>(`/lists/${listId}/tasks`);
  return dtos.map(mapTaskDto).sort((a, b) => a.position - b.position);
}

export async function getTaskById(taskId: string): Promise<Task> {
  const dto = await api.get<TaskDto>(`/tasks/${taskId}`);
  return mapTaskDto(dto);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const dto = await api.post<TaskDto>(`/lists/${input.listId}/tasks`, {
    title: input.title,
    description: input.description || undefined,
    dueDate: input.dueDate || undefined,
    assigneeId: input.assigneeId || undefined,
    priority: input.priority || undefined,
  });
  return mapTaskDto(dto);
}

export async function updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate;
  if (updates.assigneeId !== undefined) payload.assigneeId = updates.assigneeId;
  if (updates.priority !== undefined) payload.priority = updates.priority;

  const dto = await api.patch<TaskDto>(`/tasks/${taskId}`, payload);
  return mapTaskDto(dto);
}

export async function moveTask(input: MoveTaskInput): Promise<Task> {
  const dto = await api.patch<TaskDto>(`/tasks/${input.taskId}/move`, {
    taskListId: input.taskListId,
    position: input.position,
  });
  return mapTaskDto(dto);
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete<void>(`/tasks/${taskId}`);
}

export async function getMyTasks(): Promise<Task[]> {
  const dtos = await api.get<TaskDto[]>("/users/me/tasks");
  return (dtos || []).map(mapTaskDto);
}
