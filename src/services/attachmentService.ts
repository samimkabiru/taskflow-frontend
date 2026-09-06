"use client";

import { api } from "@/lib/apiClient";
import type { Attachment, AttachmentDto } from "@/lib/types";

export function mapAttachmentDto(dto: AttachmentDto): Attachment {
  return {
    id: dto.id,
    taskId: dto.taskId,
    fileName: dto.fileName,
    fileUrl: `/attachments/${dto.id}/download`,
    fileSize: dto.fileSizeBytes,
    mimeType: dto.contentType,
    uploadedById: dto.uploadedBy,
    createdAt: dto.createdAt,
    uploadedBy: {
      id: dto.uploadedBy,
      fullName: dto.uploadedBy || "Member",
      email: "",
      createdAt: dto.createdAt,
    },
  };
}

export async function getAttachmentsForTask(taskId: string): Promise<Attachment[]> {
  const dtos = await api.get<AttachmentDto[]>(`/tasks/${taskId}/attachments`);
  return dtos.map(mapAttachmentDto);
}

export async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const dto = await api.upload<AttachmentDto>(`/tasks/${taskId}/attachments`, formData);
  return mapAttachmentDto(dto);
}

export async function downloadAttachment(attachmentId: string, fileName?: string): Promise<void> {
  await api.downloadBlob(`/attachments/${attachmentId}/download`, fileName || "download");
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await api.delete<void>(`/attachments/${attachmentId}`);
}
