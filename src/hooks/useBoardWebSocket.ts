"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { WS_BASE_URL, getAccessToken, onTokenChange } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  mapTaskDto,
  mapTaskListDto,
} from "@/services/taskService";
import { mapMemberDto } from "@/services/boardService";
import { mapLabelDto } from "@/services/labelService";
import { mapCommentDto } from "@/services/commentService";
import { mapAttachmentDto } from "@/services/attachmentService";
import type {
  WebSocketMessage,
  TaskDto,
  TaskListDto,
  LabelDto,
  CommentDto,
  AttachmentDto,
  BoardMemberDto,
  BoardDto,
  BoardInviteDto,
  TaskLabelsChangedPayload,
  Task,
  TaskList,
  Label,
  BoardMember,
  Comment,
  Attachment,
} from "@/lib/types";

export interface BoardWebSocketCallbacks {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskMoved?: (task: Task) => void;
  onTaskLabelsChanged?: (taskId: string, labels: Label[]) => void;
  onListCreated?: (list: TaskList) => void;
  onListRenamed?: (list: TaskList) => void;
  onListDeleted?: (listId: string) => void;
  onListReordered?: (list: TaskList) => void;
  onLabelCreated?: (label: Label) => void;
  onLabelUpdated?: (label: Label) => void;
  onLabelDeleted?: (labelId: string) => void;
  onMemberAdded?: (member: BoardMember) => void;
  onMemberRoleChanged?: (member: BoardMember) => void;
  onMemberRemoved?: (userId: string) => void;
  onMemberInvited?: (invite: BoardInviteDto) => void;
  onBoardUpdated?: (board: BoardDto) => void;
  onCommentAdded?: (comment: Comment) => void;
  onCommentUpdated?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string, taskId?: string) => void;
  onAttachmentAdded?: (attachment: Attachment) => void;
  onAttachmentRemoved?: (attachmentId: string, taskId?: string) => void;
}

export function useBoardWebSocket(
  boardId: string | undefined | null,
  callbacks: BoardWebSocketCallbacks
) {
  const router = useRouter();
  const { user, setUserBoardRole } = useAuth();
  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const callbacksRef = useRef<BoardWebSocketCallbacks>(callbacks);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!boardId) return;

    let isDisposed = false;

    const connectStompClient = () => {
      const token = getAccessToken();
      if (!token) return;

      // Deactivate existing client if any
      if (clientRef.current) {
        try {
          clientRef.current.deactivate();
        } catch {}
      }

      const client = new Client({
        brokerURL: `${WS_BASE_URL}/ws`,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => {
          // Silent in production
        },
      });

      client.onConnect = () => {
        if (isDisposed) return;

        // Subscribe to /topic/boards/{boardId}
        const topic = `/topic/boards/${boardId}`;
        subscriptionRef.current = client.subscribe(topic, (message: IMessage) => {
          try {
            const data: WebSocketMessage = JSON.parse(message.body);
            const { eventType, payload } = data;
            const cb = callbacksRef.current;

            switch (eventType) {
              case "TASK_CREATED": {
                const taskDto = payload as TaskDto;
                cb.onTaskCreated?.(mapTaskDto(taskDto));
                break;
              }

              case "TASK_UPDATED": {
                const taskDto = payload as TaskDto;
                cb.onTaskUpdated?.(mapTaskDto(taskDto));
                break;
              }

              case "TASK_DELETED": {
                const taskDto = payload as TaskDto;
                cb.onTaskDeleted?.(taskDto.id);
                break;
              }

              case "TASK_MOVED": {
                const taskDto = payload as TaskDto;
                cb.onTaskMoved?.(mapTaskDto(taskDto));
                break;
              }

              case "TASK_LABELS_CHANGED": {
                const raw = (payload || {}) as Record<string, unknown>;
                const targetTaskId =
                  (raw.taskId as string) ||
                  (raw.task_id as string) ||
                  (raw.id as string) ||
                  "";
                const rawLabels = Array.isArray(raw.labels) ? raw.labels : [];
                const mappedLabels: Label[] = rawLabels.map((l: unknown) => {
                  if (typeof l === "string") {
                    return { id: l, boardId: boardId, name: "", color: "" };
                  }
                  return mapLabelDto(l as LabelDto);
                });
                cb.onTaskLabelsChanged?.(targetTaskId, mappedLabels);
                break;
              }

              case "LIST_CREATED": {
                const listDto = payload as TaskListDto;
                cb.onListCreated?.(mapTaskListDto(listDto));
                break;
              }

              case "LIST_RENAMED": {
                const listDto = payload as TaskListDto;
                cb.onListRenamed?.(mapTaskListDto(listDto));
                break;
              }

              case "LIST_DELETED": {
                const listDto = payload as TaskListDto;
                cb.onListDeleted?.(listDto.id);
                break;
              }

              case "LIST_REORDERED": {
                const listDto = payload as TaskListDto;
                cb.onListReordered?.(mapTaskListDto(listDto));
                break;
              }

              case "LABEL_CREATED": {
                const labelDto = payload as LabelDto;
                cb.onLabelCreated?.(mapLabelDto(labelDto));
                break;
              }

              case "LABEL_UPDATED": {
                const labelDto = payload as LabelDto;
                cb.onLabelUpdated?.(mapLabelDto(labelDto));
                break;
              }

              case "LABEL_DELETED": {
                const labelDto = payload as LabelDto;
                cb.onLabelDeleted?.(labelDto.id);
                break;
              }

              case "MEMBER_INVITED": {
                const inviteDto = payload as BoardInviteDto;
                cb.onMemberInvited?.(inviteDto);
                break;
              }

              case "MEMBER_ADDED": {
                const memberDto = payload as BoardMemberDto;
                const member = mapMemberDto(memberDto);
                member.boardId = boardId;
                cb.onMemberAdded?.(member);
                break;
              }

              case "MEMBER_ROLE_CHANGED": {
                const memberDto = payload as BoardMemberDto;
                const member = mapMemberDto(memberDto);
                member.boardId = boardId;
                cb.onMemberRoleChanged?.(member);

                // If role changed for current user, update permission state immediately (§6)
                if (user && memberDto.userId === user.id) {
                  setUserBoardRole(boardId, memberDto.role);
                  toast.info(`Your role on this board was changed to ${memberDto.role}`);
                }
                break;
              }

              case "MEMBER_REMOVED": {
                const memberDto = payload as BoardMemberDto;
                const removedUserId =
                  memberDto?.userId ||
                  (payload as any)?.user_id ||
                  (payload as any)?.id ||
                  (typeof payload === "string" ? payload : undefined);

                cb.onMemberRemoved?.(removedUserId || memberDto?.userId);

                // If current user was removed or left, dispatch boards-updated and redirect (§6)
                if (user && (removedUserId === user.id || memberDto?.userId === user.id)) {
                  toast.error("You have been removed from this board");
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("boards-updated"));
                  }
                  router.push("/boards");
                }
                break;
              }

              case "BOARD_UPDATED": {
                const boardDto = payload as BoardDto;
                cb.onBoardUpdated?.(boardDto);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("boards-updated"));
                }
                break;
              }

              case "BOARD_DELETED": {
                // Board was deleted: redirect user to dashboard (§6)
                toast.error("This board was deleted");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("boards-updated"));
                }
                router.push("/boards");
                break;
              }

              case "COMMENT_ADDED": {
                const commentDto = payload as CommentDto;
                cb.onCommentAdded?.(mapCommentDto(commentDto));
                break;
              }

              case "COMMENT_UPDATED": {
                const commentDto = payload as CommentDto;
                cb.onCommentUpdated?.(mapCommentDto(commentDto));
                break;
              }

              case "COMMENT_DELETED": {
                const raw = (payload || {}) as Record<string, unknown>;
                const commentId = (raw.id as string) || (raw.commentId as string) || "";
                const taskId = (raw.taskId as string) || (raw.task_id as string) || undefined;
                cb.onCommentDeleted?.(commentId, taskId);
                break;
              }

              case "ATTACHMENT_ADDED": {
                const attDto = payload as AttachmentDto;
                cb.onAttachmentAdded?.(mapAttachmentDto(attDto));
                break;
              }

              case "ATTACHMENT_REMOVED": {
                const raw = (payload || {}) as Record<string, unknown>;
                const attId = (raw.id as string) || (raw.attachmentId as string) || "";
                const taskId = (raw.taskId as string) || (raw.task_id as string) || undefined;
                cb.onAttachmentRemoved?.(attId, taskId);
                break;
              }

              default:
                // Silently ignore unrecognized types per §6
                break;
            }
          } catch {
            // Ignore parse errors silently
          }
        });
      };

      client.onStompError = () => {
        // Silently handle stomp level errors
      };

      client.activate();
      clientRef.current = client;
    };

    connectStompClient();

    // Reconnect with new token if token rotates (§6)
    const unsubscribeTokenChange = onTokenChange(() => {
      connectStompClient();
    });

    return () => {
      isDisposed = true;
      unsubscribeTokenChange();
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe();
        } catch {}
      }
      if (clientRef.current) {
        try {
          clientRef.current.deactivate();
        } catch {}
      }
    };
  }, [boardId, user, router, setUserBoardRole]);
}
