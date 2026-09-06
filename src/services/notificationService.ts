"use client";

import { api } from "@/lib/apiClient";
import type { Notification, NotificationDto, NotificationType, SpringPage } from "@/lib/types";

function truncateText(text: string, maxLen: number = 28): string {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen).trimEnd()}…` : trimmed;
}

export function mapNotificationDto(dto: NotificationDto): Notification {
  const payload = dto.payload || {};
  const rawDto = dto as unknown as Record<string, unknown>;

  const rawTaskTitle = (payload.taskTitle as string) || (payload.task_title as string) || (payload.title as string) || "Task";
  const taskTitle = truncateText(rawTaskTitle, 28);
  const boardName = (payload.boardName as string) || (payload.board_name as string) || (payload.name as string) || "Board";
  const shortCode = (payload.short_code as string) || (payload.shortCode as string);

  const assignerName =
    (payload.assigner_name as string) ||
    (payload.assignerName as string) ||
    (payload.actorName as string) ||
    (payload.actor_name as string) ||
    (payload.user_name as string) ||
    (payload.userName as string) ||
    "Someone";

  const inviterName =
    (payload.inviter_name as string) ||
    (payload.inviterName as string) ||
    (payload.actorName as string) ||
    (payload.actor_name as string) ||
    (payload.user_name as string) ||
    (payload.userName as string) ||
    "Someone";

  const accepterName =
    (payload.accepter_name as string) ||
    (payload.accepterName as string) ||
    (payload.actorName as string) ||
    (payload.actor_name as string) ||
    (payload.user_name as string) ||
    (payload.userName as string) ||
    "Someone";

  const commenterName =
    (payload.commenter_name as string) ||
    (payload.commenterName as string) ||
    (payload.author_name as string) ||
    (payload.authorName as string) ||
    (payload.actorName as string) ||
    (payload.actor_name as string) ||
    (payload.user_name as string) ||
    (payload.userName as string) ||
    "Someone";

  const moverName =
    (payload.mover_name as string) ||
    (payload.moverName as string) ||
    (payload.actor_name as string) ||
    (payload.actorName as string) ||
    (payload.user_name as string) ||
    (payload.userName as string) ||
    "Someone";

  const toList =
    (payload.to_list as string) ||
    (payload.toList as string) ||
    (payload.list_name as string) ||
    (payload.listName as string) ||
    "";

  const commentSnippet =
    (payload.comment_snippet as string) ||
    (payload.commentSnippet as string) ||
    (payload.content as string) ||
    (payload.snippet as string);

  const actorName =
    moverName !== "Someone"
      ? moverName
      : assignerName !== "Someone"
      ? assignerName
      : commenterName !== "Someone"
      ? commenterName
      : inviterName;

  const boardId = (payload.boardId as string) || (payload.board_id as string) || (rawDto.boardId as string) || (rawDto.board_id as string);
  const taskId = (payload.taskId as string) || (payload.task_id as string) || (rawDto.taskId as string) || (rawDto.task_id as string);

  // Identify true notification type even if backend miscategorized it or sent variants
  const rawType = String(dto.type || "").toUpperCase();

  const isStatusChange =
    rawType === "STATUS_CHANGE" ||
    rawType === "STATUS_CHANGED" ||
    rawType === "TASK_MOVED" ||
    rawType === "TASK_STATUS_CHANGED" ||
    rawType === "MOVED" ||
    Boolean(payload.list_name || payload.listName || payload.to_list || payload.toList || payload.from_list || payload.fromList);

  const hasCommentPayload = Boolean(
    payload.commenter_name ||
    payload.commenterName ||
    payload.comment_snippet ||
    payload.commentSnippet
  );

  const isComment =
    !isStatusChange &&
    (rawType === "COMMENT" ||
      rawType === "COMMENT_ADDED" ||
      rawType === "NEW_COMMENT" ||
      hasCommentPayload);

  const hasAssignmentPayload = Boolean(
    payload.assigner_name ||
    payload.assignerName
  );

  const isAssignment =
    !isStatusChange &&
    !isComment &&
    (rawType === "ASSIGNMENT" ||
      rawType === "TASK_ASSIGNED" ||
      rawType === "TASK_ASSIGNMENT" ||
      rawType === "ASSIGNED" ||
      hasAssignmentPayload);

  const effectiveType: NotificationType =
    isStatusChange
      ? "STATUS_CHANGE"
      : isComment
      ? "COMMENT"
      : isAssignment
      ? "ASSIGNMENT"
      : (dto.type as NotificationType);

  let title = "Notification";
  let message = "You have a new notification";
  let linkTo: string | undefined = undefined;

  if (boardId) {
    linkTo = `/boards/${boardId}`;
    if (taskId) {
      linkTo = `/boards/${boardId}/tasks/${taskId}`;
    }
  }

  switch (effectiveType) {
    case "ASSIGNMENT": {
      title = "New Assignment";
      message = shortCode
        ? `${assignerName} assigned you to ${shortCode}`
        : `${assignerName} assigned you to a task`;
      break;
    }
    case "COMMENT": {
      title = "New Comment";
      const taskDisplay = shortCode ? `[${shortCode}]` : `"${taskTitle}"`;
      const cleanSnippet = commentSnippet ? commentSnippet.replace(/\s+/g, " ").trim() : "";
      message = cleanSnippet
        ? `${commenterName} commented on ${taskDisplay}: "${truncateText(cleanSnippet, 60)}"`
        : `${commenterName} commented on ${taskDisplay}`;
      break;
    }
    case "STATUS_CHANGE": {
      title = "Task Moved";
      const taskDisplay = shortCode ? `[${shortCode}]` : `"${taskTitle}"`;
      const listName = toList || (payload.list_name as string) || (payload.listName as string) || "another list";
      message = moverName !== "Someone"
        ? `${moverName} moved ${taskDisplay} to "${listName}"`
        : `${taskDisplay} was moved to "${listName}"`;
      break;
    }
    case "DUE_SOON": {
      const rawDays = payload.days_until_due ?? payload.daysUntilDue;
      const days = typeof rawDays === "number" ? rawDays : typeof rawDays === "string" ? parseInt(rawDays, 10) : undefined;
      const dueText = days === 0 ? "due today" : days === 1 ? "due tomorrow" : days === 2 ? "due in 2 days" : typeof days === "number" && days > 2 ? `due in ${days} days` : "due soon";
      title = days === 1 ? "Due Tomorrow" : days === 0 ? "Due Today" : "Due Soon";
      const taskDisplay = shortCode ? `[${shortCode}]` : `"${taskTitle}"`;
      message = `${taskDisplay} is ${dueText}`;
      break;
    }
    case "INVITE": {
      const isAcceptance = Boolean(payload.accepter_name || payload.accepterName || (!payload.invite_id && !payload.inviteId));
      if (isAcceptance) {
        title = "Invitation Accepted";
        message = `${accepterName} accepted your invite to join "${boardName}"`;
      } else {
        title = "Board Invitation";
        message = `${inviterName} invited you to join "${boardName}"`;
      }
      break;
    }
  }

  return {
    id: dto.id,
    userId: dto.recipientId,
    type: effectiveType,
    title,
    message,
    linkTo,
    payload: {
      ...payload,
      invite_id: (payload.invite_id as string) || (payload.inviteId as string),
      inviteId: (payload.inviteId as string) || (payload.invite_id as string),
      board_id: boardId,
      boardId: boardId,
      task_id: taskId,
      taskId: taskId,
      short_code: shortCode,
      shortCode: shortCode,
      commenter_name: commenterName,
      commenterName: commenterName,
      comment_snippet: commentSnippet,
      commentSnippet: commentSnippet,
      mover_name: moverName,
      moverName: moverName,
      to_list: toList,
      toList: toList,
      task_title: rawTaskTitle,
      taskTitle: rawTaskTitle,
      raw_task_title: rawTaskTitle,
    },
    isRead: dto.isRead,
    createdAt: dto.createdAt,
  };
}

/**
 * GET /notifications?page={page}&size={size}&sort=createdAt,desc
 */
export async function getNotifications(page = 0, size = 20): Promise<{
  notifications: Notification[];
  totalPages: number;
  hasMore: boolean;
}> {
  const response = await api.get<SpringPage<NotificationDto>>(
    `/notifications?page=${page}&size=${size}&sort=createdAt,desc`
  );
  const notifications = (response.content || []).map(mapNotificationDto);
  return {
    notifications,
    totalPages: response.totalPages,
    hasMore: response.number + 1 < response.totalPages,
  };
}

/**
 * GET /notifications/unread-count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const res = await api.get<unknown>("/notifications/unread-count");
    if (typeof res === "number") return res;
    if (typeof res === "string") {
      const parsed = parseInt(res, 10);
      if (!isNaN(parsed)) return parsed;
    }
    if (res && typeof res === "object") {
      const obj = res as Record<string, unknown>;
      const val = obj.count ?? obj.unreadCount ?? obj.unread_count ?? obj.data;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * PATCH /notifications/{id}/read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  await api.patch<void>(`/notifications/${id}/read`);
}

/**
 * PATCH /notifications/read-all
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await api.patch<void>("/notifications/read-all");
}

/**
 * DELETE /notifications/{id}
 */
export async function deleteNotification(id: string): Promise<void> {
  await api.delete<void>(`/notifications/${id}`);
}

/**
 * DELETE /notifications/clear-all
 */
export async function clearAllNotifications(): Promise<void> {
  await api.delete<void>("/notifications/clear-all");
}

