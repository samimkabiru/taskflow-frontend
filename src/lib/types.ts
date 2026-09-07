// ─── Entity Types ───────────────────────────────────────────
// Mirrors the Spring Boot + Postgres backend schema

export type BoardRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type NotificationType = 'ASSIGNMENT' | 'DUE_SOON' | 'COMMENT' | 'STATUS_CHANGE' | 'INVITE';

export type ActivityAction =
  | 'TASK_CREATED'
  | 'TASK_MOVED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'LIST_CREATED'
  | 'LIST_RENAMED'
  | 'LIST_DELETED'
  | 'BOARD_CREATED'
  | 'BOARD_UPDATED'
  | 'MEMBER_INVITED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'
  | (string & {});

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  avatarUpdatedAt?: number;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  taskPrefix?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  /** Computed for dashboard display */
  memberCount?: number;
  taskCount?: number;
  completedTaskCount?: number;
  hasDoneList?: boolean;
  currentUserRole?: BoardRole;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: BoardRole;
  joinedAt: string;
  user: User;
}

export interface PendingInvite {
  id: string;
  boardId: string;
  email: string;
  role: BoardRole;
  invitedAt: string;
  invitedBy: string;
}

export interface TaskList {
  id: string;
  boardId: string;
  name: string;
  position: number;
  createdAt: string;
  clientKey?: string;
}

export interface Task {
  id: string;
  shortCode: string;
  title: string;
  description: string;
  priority?: Priority | null;
  dueDate?: string;
  assigneeId?: string;
  assignee?: User;
  listId: string;
  boardId: string;
  labelIds: string[];
  labels?: Label[];
  position: number;
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  author: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedBy: User;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  boardId: string;
  action: ActivityAction;
  actorId: string;
  actor: User;
  targetType: 'TASK' | 'LIST' | 'BOARD' | 'MEMBER' | 'COMMENT' | 'ATTACHMENT';
  targetId: string;
  targetName: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkTo?: string;
  actorId?: string;
  actor?: User;
  payload?: {
    invite_id?: string;
    [key: string]: unknown;
  };
  isRead: boolean;
  createdAt: string;
}

// ─── Backend DTO Shapes (§4 verbatim) ─────────────────────────

export interface UserDto {
  fullName: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface BoardDto {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  taskPrefix?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMemberDto {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  role: BoardRole;
  joinedAt: string;
}

export interface BoardInviteDto {
  id: string;
  boardId: string;
  email: string;
  role: BoardRole | string;
  status: string;
  createdAt: string;
}

export interface TaskListDto {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabelDto {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface TaskDto {
  id: string;
  boardId: string;
  taskListId: string;
  shortCode: string;
  title: string;
  description?: string | null;
  position: number;
  priority?: Priority | string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  createdBy: string;
  labels: LabelDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentDto {
  id: string;
  taskId: string;
  authorId: string;
  authorFullName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentDto {
  id: string;
  taskId: string;
  uploadedBy: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface ActivityLogDto {
  id: string;
  boardId: string;
  taskId?: string | null;
  actorId: string;
  actorFullName: string;
  actionType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  recipientId: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface TaskLabelsChangedPayload {
  taskId: string;
  labels: LabelDto[];
}

// ─── WebSocket Event Types (§6 verbatim - 23 events) ─────────

export type WebSocketEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_MOVED'
  | 'TASK_LABELS_CHANGED'
  | 'LIST_CREATED'
  | 'LIST_RENAMED'
  | 'LIST_DELETED'
  | 'LIST_REORDERED'
  | 'COMMENT_ADDED'
  | 'COMMENT_UPDATED'
  | 'COMMENT_DELETED'
  | 'LABEL_CREATED'
  | 'LABEL_UPDATED'
  | 'LABEL_DELETED'
  | 'MEMBER_INVITED'
  | 'MEMBER_ADDED'
  | 'MEMBER_ROLE_CHANGED'
  | 'MEMBER_REMOVED'
  | 'BOARD_UPDATED'
  | 'BOARD_DELETED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED';

export interface WebSocketMessage<T = unknown> {
  eventType: WebSocketEventType | string;
  payload: T;
}

// ─── Spring Page Response (§5 verbatim) ──────────────────────

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 0-indexed current page
  size: number;
  last?: boolean;
  first?: boolean;
  empty?: boolean;
}

export interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ─── Permission Matrix ──────────────────────────────────────

export type Permission =
  | 'VIEW_BOARD'
  | 'CREATE_TASK'
  | 'EDIT_TASK'
  | 'MOVE_TASK'
  | 'DELETE_TASK'
  | 'CREATE_LIST'
  | 'EDIT_LIST'
  | 'DELETE_LIST'
  | 'CREATE_LABEL'
  | 'EDIT_LABEL'
  | 'DELETE_LABEL'
  | 'COMMENT'
  | 'MANAGE_MEMBERS'
  | 'MANAGE_SETTINGS'
  | 'DELETE_BOARD';

const ROLE_PERMISSIONS: Record<BoardRole, Permission[]> = {
  OWNER: [
    'VIEW_BOARD', 'CREATE_TASK', 'EDIT_TASK', 'MOVE_TASK', 'DELETE_TASK',
    'CREATE_LIST', 'EDIT_LIST', 'DELETE_LIST',
    'CREATE_LABEL', 'EDIT_LABEL', 'DELETE_LABEL',
    'COMMENT', 'MANAGE_MEMBERS', 'MANAGE_SETTINGS', 'DELETE_BOARD',
  ],
  ADMIN: [
    'VIEW_BOARD', 'CREATE_TASK', 'EDIT_TASK', 'MOVE_TASK', 'DELETE_TASK',
    'CREATE_LIST', 'EDIT_LIST', 'DELETE_LIST',
    'CREATE_LABEL', 'EDIT_LABEL', 'DELETE_LABEL',
    'COMMENT', 'MANAGE_MEMBERS', 'MANAGE_SETTINGS',
  ],
  MEMBER: [
    'VIEW_BOARD', 'CREATE_TASK', 'EDIT_TASK', 'MOVE_TASK', 'DELETE_TASK',
    'CREATE_LIST', 'EDIT_LIST', 'DELETE_LIST',
    'CREATE_LABEL', 'EDIT_LABEL', 'DELETE_LABEL',
    'COMMENT',
  ],
  VIEWER: ['VIEW_BOARD'],
};

export function hasPermission(role: BoardRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissions(role: BoardRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}
