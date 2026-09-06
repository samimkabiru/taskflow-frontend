"use client";

import { api } from "@/lib/apiClient";
import type { Label, LabelDto } from "@/lib/types";

export interface CreateLabelInput {
  name: string;
  color: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
}

export function mapLabelDto(dto: LabelDto): Label {
  return {
    id: dto.id,
    boardId: dto.boardId,
    name: dto.name,
    color: dto.color,
  };
}

export async function getLabelsForBoard(boardId: string): Promise<Label[]> {
  const dtos = await api.get<LabelDto[]>(`/boards/${boardId}/labels`);
  return dtos.map(mapLabelDto);
}

export async function createLabel(boardId: string, input: CreateLabelInput): Promise<Label> {
  const dto = await api.post<LabelDto>(`/boards/${boardId}/labels`, input);
  return mapLabelDto(dto);
}

export async function updateLabel(labelId: string, input: UpdateLabelInput): Promise<Label> {
  const dto = await api.patch<LabelDto>(`/labels/${labelId}`, input);
  return mapLabelDto(dto);
}

export async function deleteLabel(labelId: string): Promise<void> {
  await api.delete<void>(`/labels/${labelId}`);
}

/**
 * PUT /tasks/{taskId}/labels
 * Full replacement of the task's entire label set (§0.3).
 * Always pass the complete desired array of label IDs.
 */
export async function assignLabelsToTask(taskId: string, labelIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(labelIds));
  await api.put<void>(`/tasks/${taskId}/labels`, { labelIds: uniqueIds });
}
