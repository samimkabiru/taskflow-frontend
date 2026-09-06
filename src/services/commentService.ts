"use client";

import { api } from "@/lib/apiClient";
import type { Comment, CommentDto } from "@/lib/types";

export function mapCommentDto(dto: CommentDto): Comment {
  const raw = dto as unknown as Record<string, unknown>;
  const createdAt = (raw.createdAt as string) || (raw.created_at as string) || new Date().toISOString();
  const updatedAt = (raw.updatedAt as string) || (raw.updated_at as string) || createdAt;
  const authorId = (raw.authorId as string) || (raw.author_id as string) || dto.authorId || "";
  const authorFullName =
    (raw.authorFullName as string) ||
    (raw.author_full_name as string) ||
    (raw.authorName as string) ||
    (raw.author_name as string) ||
    dto.authorFullName ||
    "Team Member";

  return {
    id: (raw.id as string) || dto.id,
    taskId: (raw.taskId as string) || (raw.task_id as string) || dto.taskId,
    authorId,
    content: dto.content || (raw.content as string) || "",
    createdAt,
    updatedAt,
    author: {
      id: authorId,
      fullName: authorFullName,
      email: (raw.authorEmail as string) || (raw.author_email as string) || "",
      avatarUrl: (raw.avatarUrl as string) || (raw.avatar_url as string) || (raw.authorAvatarUrl as string) || (raw.author_avatar_url as string) || undefined,
      createdAt,
    },
  };
}

export async function getCommentsForTask(taskId: string): Promise<Comment[]> {
  const dtos = await api.get<CommentDto[]>(`/tasks/${taskId}/comments`);
  return (dtos || []).map(mapCommentDto).sort((a, b) => {
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
  });
}

export async function createComment(taskId: string, content: string): Promise<Comment> {
  const dto = await api.post<CommentDto>(`/tasks/${taskId}/comments`, { content });
  return mapCommentDto(dto);
}

export async function updateComment(commentId: string, content: string): Promise<Comment> {
  const dto = await api.patch<CommentDto>(`/comments/${commentId}`, { content });
  return mapCommentDto(dto);
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete<void>(`/comments/${commentId}`);
}
