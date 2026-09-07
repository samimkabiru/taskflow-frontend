"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  Filter, X, Activity, MessageSquare, AlertTriangle,
  LayoutDashboard, UserPlus, Plus, Paperclip, History,
  Calendar, Layers, ListFilter, User, ArrowLeft, Home, Search, Pencil, Trash2, Shield, UserMinus,
} from "lucide-react";
import { getBoard } from "@/services/boardService";
import { getActivityForBoard } from "@/services/activityService";
import { useBoardWebSocket } from "@/hooks/useBoardWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import NotFoundState from "@/components/ui/NotFoundState";
import { cn } from "@/lib/utils";
import type { ActivityEntry, Board } from "@/lib/types";

// ─── Action metadata ──────────────────────────────────────
type ActionMeta = {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconFg: string;
  pillBg: string;
  pillFg: string;
};

const ACTION_META: Record<string, ActionMeta> = {
  TASK_MOVED:       { label: "Moved",       icon: LayoutDashboard, iconBg: "bg-tertiary/15 border-tertiary/30",   iconFg: "text-tertiary",   pillBg: "bg-tertiary/10 border-tertiary/20",   pillFg: "text-tertiary" },
  TASK_UPDATED:     { label: "Updated",     icon: Pencil,          iconBg: "bg-primary/15 border-primary/30",     iconFg: "text-primary",    pillBg: "bg-primary/10 border-primary/20",     pillFg: "text-primary" },
  TASK_DELETED:     { label: "Deleted",     icon: Trash2,          iconBg: "bg-error/15 border-error/30",         iconFg: "text-error",      pillBg: "bg-error/10 border-error/20",         pillFg: "text-error" },
  COMMENT_ADDED:    { label: "Comment",     icon: MessageSquare,   iconBg: "bg-primary/15 border-primary/30",     iconFg: "text-primary",    pillBg: "bg-primary/10 border-primary/20",     pillFg: "text-primary" },
  PRIORITY_CHANGED: { label: "Priority",    icon: AlertTriangle,   iconBg: "bg-error/15 border-error/30",         iconFg: "text-error",      pillBg: "bg-error/10 border-error/20",         pillFg: "text-error" },
  TASK_CREATED:     { label: "Created",     icon: Plus,            iconBg: "bg-secondary/15 border-secondary/30", iconFg: "text-secondary", pillBg: "bg-secondary/10 border-secondary/20", pillFg: "text-secondary" },
  TASK_ASSIGNED:    { label: "Assigned",    icon: UserPlus,        iconBg: "bg-tertiary/15 border-tertiary/30",   iconFg: "text-tertiary",   pillBg: "bg-tertiary/10 border-tertiary/20",   pillFg: "text-tertiary" },
  ASSIGNEE_CHANGED: { label: "Assigned",    icon: UserPlus,        iconBg: "bg-tertiary/15 border-tertiary/30",   iconFg: "text-tertiary",   pillBg: "bg-tertiary/10 border-tertiary/20",   pillFg: "text-tertiary" },
  MEMBER_INVITED:   { label: "Member",      icon: UserPlus,        iconBg: "bg-emerald-500/15 border-emerald-500/30", iconFg: "text-emerald-500", pillBg: "bg-emerald-500/10 border-emerald-500/20", pillFg: "text-emerald-500" },
  MEMBER_ADDED:     { label: "Member",      icon: UserPlus,        iconBg: "bg-emerald-500/15 border-emerald-500/30", iconFg: "text-emerald-500", pillBg: "bg-emerald-500/10 border-emerald-500/20", pillFg: "text-emerald-500" },
  MEMBER_REMOVED:   { label: "Member",      icon: UserMinus,       iconBg: "bg-error/15 border-error/30",         iconFg: "text-error",      pillBg: "bg-error/10 border-error/20",         pillFg: "text-error" },
  MEMBER_ROLE_CHANGED: { label: "Role",     icon: Shield,          iconBg: "bg-tertiary/15 border-tertiary/30",   iconFg: "text-tertiary",   pillBg: "bg-tertiary/10 border-tertiary/20",   pillFg: "text-tertiary" },
  ATTACHMENT_ADDED: { label: "Attachment",  icon: Paperclip,       iconBg: "bg-primary/15 border-primary/30",     iconFg: "text-primary",    pillBg: "bg-primary/10 border-primary/20",     pillFg: "text-primary" },
  ATTACHMENT_REMOVED: { label: "Attachment", icon: Paperclip,      iconBg: "bg-error/15 border-error/30",         iconFg: "text-error",      pillBg: "bg-error/10 border-error/20",         pillFg: "text-error" },
  BOARD_CREATED:    { label: "Board",       icon: LayoutDashboard, iconBg: "bg-primary/15 border-primary/30",     iconFg: "text-primary",    pillBg: "bg-primary/10 border-primary/20",     pillFg: "text-primary" },
  BOARD_UPDATED:    { label: "Board",       icon: LayoutDashboard, iconBg: "bg-primary/15 border-primary/30",     iconFg: "text-primary",    pillBg: "bg-primary/10 border-primary/20",     pillFg: "text-primary" },
  LIST_CREATED:     { label: "List",        icon: Layers,          iconBg: "bg-secondary/15 border-secondary/30", iconFg: "text-secondary", pillBg: "bg-secondary/10 border-secondary/20", pillFg: "text-secondary" },
  LIST_RENAMED:     { label: "List",        icon: Layers,          iconBg: "bg-secondary/15 border-secondary/30", iconFg: "text-secondary", pillBg: "bg-secondary/10 border-secondary/20", pillFg: "text-secondary" },
  LIST_DELETED:     { label: "List",        icon: Layers,          iconBg: "bg-error/15 border-error/30",         iconFg: "text-error",      pillBg: "bg-error/10 border-error/20",         pillFg: "text-error" },
};

function getMeta(action: string): ActionMeta {
  return ACTION_META[action] ?? {
    label: "Update",
    icon: History,
    iconBg: "bg-outline-variant/30 border-outline-variant/40",
    iconFg: "text-on-surface-variant",
    pillBg: "bg-outline-variant/20 border-outline-variant/30",
    pillFg: "text-on-surface-variant",
  };
}

// ─── Helpers ─────────────────────────────────────────────
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3 select-none">
      <div className="flex-1 h-px bg-outline-variant/30" />
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-low border border-outline-variant/40 shadow-2xs">
        <Calendar size={11} className="text-outline" />
        <span className="font-[family-name:var(--font-mono)] text-[10.5px] font-semibold text-outline uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex-1 h-px bg-outline-variant/30" />
    </div>
  );
}

const PRIORITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  LOW: {
    label: "Low",
    bg: "bg-emerald-500/10",
    text: "text-emerald-500 dark:text-emerald-400",
    border: "border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  MEDIUM: {
    label: "Medium",
    bg: "bg-amber-500/10",
    text: "text-amber-500 dark:text-amber-400",
    border: "border-amber-500/25",
    dot: "bg-amber-500",
  },
  HIGH: {
    label: "High",
    bg: "bg-orange-500/10",
    text: "text-orange-500 dark:text-orange-400",
    border: "border-orange-500/25",
    dot: "bg-orange-500",
  },
  URGENT: {
    label: "Urgent",
    bg: "bg-error/10",
    text: "text-error",
    border: "border-error/25",
    dot: "bg-error",
  },
};

function renderPriorityPill(priorityKey: unknown) {
  if (!priorityKey || typeof priorityKey !== "string") return null;
  const key = priorityKey.toUpperCase();
  const meta = PRIORITY_STYLES[key] ?? {
    label: priorityKey,
    bg: "bg-outline-variant/15",
    text: "text-on-surface-variant",
    border: "border-outline-variant/30",
    dot: "bg-outline",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shadow-2xs align-baseline mx-0.5",
        meta.bg,
        meta.text,
        meta.border
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
      {meta.label}
    </span>
  );
}

const ROLE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OWNER: {
    label: "Owner",
    bg: "bg-amber-500/10",
    text: "text-amber-500 dark:text-amber-400",
    border: "border-amber-500/25",
  },
  ADMIN: {
    label: "Admin",
    bg: "bg-tertiary/10",
    text: "text-tertiary dark:text-tertiary-light",
    border: "border-tertiary/25",
  },
  MEMBER: {
    label: "Member",
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/25",
  },
  VIEWER: {
    label: "Viewer",
    bg: "bg-outline-variant/15",
    text: "text-on-surface-variant",
    border: "border-outline-variant/30",
  },
};

function renderRolePill(roleKey: unknown) {
  if (!roleKey || typeof roleKey !== "string") return null;
  const key = roleKey.toUpperCase();
  const meta = ROLE_STYLES[key] ?? {
    label: roleKey,
    bg: "bg-outline-variant/15",
    text: "text-on-surface-variant",
    border: "border-outline-variant/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border shadow-2xs align-baseline mx-0.5",
        meta.bg,
        meta.text,
        meta.border
      )}
    >
      {meta.label}
    </span>
  );
}

function getDescription(
  entry: ActivityEntry,
  boardId: string,
  currentUser?: { id: string; email?: string; fullName?: string } | null
) {
  const isActorSelf = Boolean(
    currentUser && (
      (currentUser.id && entry.actor.id === currentUser.id) ||
      (currentUser.email && (entry.actor.id === currentUser.email || entry.actor.fullName?.toLowerCase() === currentUser.email.toLowerCase())) ||
      (currentUser.fullName && entry.actor.fullName?.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase())
    )
  );

  const isTargetSelf = Boolean(
    currentUser && (
      (entry.targetId && entry.targetId === currentUser.id) ||
      (entry.targetName && currentUser.fullName && entry.targetName.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) ||
      (entry.metadata?.invited_name && currentUser.fullName && String(entry.metadata?.invited_name).trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) ||
      (entry.metadata?.removed_name && currentUser.fullName && String(entry.metadata?.removed_name).trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) ||
      (entry.metadata?.removedName && currentUser.fullName && String(entry.metadata?.removedName).trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) ||
      (entry.metadata?.member_name && currentUser.fullName && String(entry.metadata?.member_name).trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) ||
      (entry.metadata?.memberName && currentUser.fullName && String(entry.metadata?.memberName).trim().toLowerCase() === currentUser.fullName.trim().toLowerCase())
    )
  );

  const name = <span className="font-semibold text-on-surface">{isActorSelf ? "You" : entry.actor.fullName}</span>;
  const code = entry.metadata?.short_code || entry.metadata?.shortCode || (entry.targetName !== "Item" && !entry.targetName.includes(".") ? entry.targetName : null) || "Task";
  const isTask = entry.targetType === "TASK" || entry.action.startsWith("TASK_") || entry.action === "COMMENT_ADDED" || entry.action === "PRIORITY_CHANGED" || entry.action === "ASSIGNEE_CHANGED" || entry.action.startsWith("ATTACHMENT_");
  const taskId = entry.metadata?.task_id || entry.metadata?.taskId || (isTask ? entry.targetId : undefined);
  const taskLink = taskId ? `/boards/${boardId}/tasks/${taskId}` : undefined;

  const pill = taskLink ? (
    <Link
      href={taskLink}
      className="inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] text-primary bg-primary/10 border border-primary/25 rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium hover:bg-primary/20 transition-colors"
    >
      {code}
    </Link>
  ) : (
    <span className="inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] text-primary bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium">
      {code}
    </span>
  );

  const targetDisplayName =
    entry.targetName && entry.targetName !== "Item"
      ? entry.targetName
      : (entry.metadata?.board_name || entry.metadata?.boardName || entry.metadata?.list_title || entry.metadata?.listTitle || entry.metadata?.list_name || entry.metadata?.listName || entry.metadata?.name || entry.targetName);

  switch (entry.action) {
    case "TASK_MOVED": {
      const fromList = entry.metadata?.from_list || entry.metadata?.fromList;
      const toList = entry.metadata?.to_list || entry.metadata?.toList || entry.metadata?.to || "another list";
      return (
        <>
          {name} moved {pill}{fromList ? <> from <span className="font-semibold text-on-surface">&ldquo;{fromList}&rdquo;</span></> : ""} to <span className="font-semibold text-on-surface">&ldquo;{toList}&rdquo;</span>
        </>
      );
    }
    case "COMMENT_ADDED":
      return (
        <>
          {name} commented on {pill}
        </>
      );
    case "PRIORITY_CHANGED": {
      const fromPill = renderPriorityPill(entry.metadata?.from || entry.metadata?.from_priority || entry.metadata?.fromPriority);
      const toPill = renderPriorityPill(entry.metadata?.to || entry.metadata?.to_priority || entry.metadata?.toPriority || entry.metadata?.priority);
      return (
        <>
          {name} changed priority of {pill} {fromPill ? <>from {fromPill} to </> : "to "}{toPill}
        </>
      );
    }
    case "TASK_CREATED":
      return (
        <>
          {name} created task {pill}
        </>
      );
    case "TASK_UPDATED":
      return (
        <>
          {name} updated task {pill}
        </>
      );
    case "TASK_DELETED": {
      const title = entry.metadata?.title || entry.metadata?.task_title || entry.metadata?.taskTitle;
      const shortCode = entry.metadata?.short_code || entry.metadata?.shortCode || code;
      const codePill = (
        <span className="inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] text-error bg-error/10 border border-error/20 rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium">
          {shortCode}
        </span>
      );
      return (
        <>
          {name} deleted task {codePill}{title ? <> &ldquo;<span className="font-semibold text-on-surface">{title}</span>&rdquo;</> : ""}
        </>
      );
    }
    case "ASSIGNEE_CHANGED":
    case "TASK_ASSIGNED": {
      const assigneeName = entry.metadata?.assignee_name || entry.metadata?.assigneeName || entry.metadata?.user_name || entry.metadata?.userName || (entry.targetName !== "Item" && !entry.targetName.startsWith("MKT-") ? entry.targetName : undefined);
      const isAssigneeSelf = Boolean(
        currentUser && (
          (currentUser.fullName && assigneeName && String(assigneeName).trim().toLowerCase() === currentUser.fullName.trim().toLowerCase()) ||
          (currentUser.email && assigneeName && String(assigneeName).trim().toLowerCase() === currentUser.email.trim().toLowerCase())
        )
      );

      if (!assigneeName || assigneeName === "unassigned" || assigneeName === "none") {
        return (
          <>
            {name} unassigned {pill}
          </>
        );
      }

      const isSameAsActor = Boolean(
        assigneeName &&
        entry.actor.fullName &&
        String(assigneeName).trim().toLowerCase() === entry.actor.fullName.trim().toLowerCase()
      );

      let displayedAssignee: string;
      if (isActorSelf && (isAssigneeSelf || isSameAsActor)) {
        displayedAssignee = "yourself";
      } else if (isAssigneeSelf) {
        displayedAssignee = "you";
      } else if (isSameAsActor) {
        displayedAssignee = "themselves";
      } else {
        displayedAssignee = assigneeName;
      }

      return (
        <>
          {name} assigned {pill} to <span className="font-semibold text-on-surface">{displayedAssignee}</span>
        </>
      );
    }
    case "ATTACHMENT_ADDED": {
      const fileName = entry.metadata?.attachment_name || entry.metadata?.attachmentName || entry.metadata?.file_name || entry.metadata?.fileName || (entry.targetName !== "Item" ? entry.targetName : "a file");
      return (
        <>
          {name} attached <span className="font-semibold text-on-surface">{fileName}</span> to {pill}
        </>
      );
    }
    case "ATTACHMENT_REMOVED":
    case "ATTACHMENT_DELETED": {
      const fileName = entry.metadata?.attachment_name || entry.metadata?.attachmentName || entry.metadata?.file_name || entry.metadata?.fileName || (entry.targetName !== "Item" ? entry.targetName : "a file");
      return (
        <>
          {name} removed <span className="font-semibold text-on-surface">{fileName}</span> from {pill}
        </>
      );
    }
    case "MEMBER_INVITED": {
      const invitedPerson = entry.metadata?.invited_name || entry.metadata?.invitedName || (entry.targetName !== "Item" ? entry.targetName : "a new member");
      const targetLabel = isTargetSelf ? "you" : invitedPerson;
      const rolePill = renderRolePill(entry.metadata?.role || "MEMBER");
      return (
        <>
          {name} invited <span className="font-semibold text-on-surface">{targetLabel}</span> as {rolePill}
        </>
      );
    }
    case "MEMBER_ADDED": {
      const rolePill = renderRolePill(entry.metadata?.role || "MEMBER");
      return (
        <>
          {name} joined the board as {rolePill}
        </>
      );
    }
    case "MEMBER_ROLE_CHANGED": {
      const memberPerson = entry.metadata?.member_name || entry.metadata?.memberName || entry.metadata?.user_name || entry.metadata?.userName || (entry.targetName !== "Item" ? entry.targetName : "a member");
      const targetLabel = isTargetSelf ? "your" : `${memberPerson}'s`;
      const oldRolePill = renderRolePill(entry.metadata?.old_role || entry.metadata?.oldRole || entry.metadata?.from_role || entry.metadata?.from);
      const newRolePill = renderRolePill(entry.metadata?.new_role || entry.metadata?.newRole || entry.metadata?.role || entry.metadata?.to_role || entry.metadata?.to);
      return (
        <>
          {name} changed <span className="font-semibold text-on-surface">{targetLabel}</span> role {oldRolePill ? <>from {oldRolePill} to </> : "to "}{newRolePill}
        </>
      );
    }
    case "MEMBER_REMOVED": {
      const removedPerson = entry.metadata?.removed_name || entry.metadata?.removedName || entry.metadata?.user_name || entry.metadata?.userName || entry.metadata?.member_name || entry.metadata?.memberName || (entry.targetName !== "Item" ? entry.targetName : "a member");
      const targetLabel = isTargetSelf ? "you" : removedPerson;
      return (
        <>
          {name} removed <span className="font-semibold text-on-surface">{targetLabel}</span> from the board
        </>
      );
    }
    case "BOARD_CREATED":
      return (
        <>
          {name} created board <span className="font-semibold text-on-surface">&ldquo;{targetDisplayName}&rdquo;</span>
        </>
      );
    case "BOARD_UPDATED":
      return (
        <>
          {name} updated board <span className="font-semibold text-on-surface">&ldquo;{targetDisplayName}&rdquo;</span>
        </>
      );
    case "LIST_CREATED":
      return (
        <>
          {name} created list <span className="font-semibold text-on-surface">{targetDisplayName}</span>
        </>
      );
    case "LIST_RENAMED": {
      const oldTitle = entry.metadata?.old_title || entry.metadata?.oldTitle;
      const newTitle = entry.metadata?.new_title || entry.metadata?.newTitle || targetDisplayName;
      return (
        <>
          {name} renamed list {oldTitle ? <><span className="font-semibold text-on-surface">&ldquo;{oldTitle}&rdquo;</span> to </> : "to "}<span className="font-semibold text-on-surface">&ldquo;{newTitle}&rdquo;</span>
        </>
      );
    }
    case "LIST_DELETED":
      return (
        <>
          {name} deleted list <span className="font-semibold text-on-surface">&ldquo;{targetDisplayName}&rdquo;</span>
        </>
      );
    default:
      return (
        <>
          {name} updated <span className="font-semibold text-on-surface">{targetDisplayName}</span>
        </>
      );
  }
}

// ─── Pagination Number Generator ─────────────────────────
function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

// ─── Main Page Component ─────────────────────────────────
export default function ActivityFeedPage() {
  const { user } = useAuth();
  const params = useParams();
  const boardId = params.boardId as string;
  const [board, setBoard] = useState<Board | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter & Pagination States
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedActor, setSelectedActor] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchActivities = useCallback(async () => {
    try {
      const actRes = await getActivityForBoard(boardId, currentPage - 1, pageSize);
      setActivities(actRes.entries);
      setTotalPages(Math.max(1, actRes.totalPages));
    } catch {}
  }, [boardId, currentPage, pageSize]);

  // Connect STOMP WebSocket for real-time live synchronization of the feed
  useBoardWebSocket(boardId, {
    onTaskCreated: () => fetchActivities(),
    onTaskUpdated: () => fetchActivities(),
    onTaskDeleted: () => fetchActivities(),
    onTaskMoved: () => fetchActivities(),
    onTaskLabelsChanged: () => fetchActivities(),
    onListCreated: () => fetchActivities(),
    onListRenamed: () => fetchActivities(),
    onListDeleted: () => fetchActivities(),
    onCommentAdded: () => fetchActivities(),
    onAttachmentAdded: () => fetchActivities(),
    onMemberAdded: () => fetchActivities(),
    onMemberRoleChanged: () => fetchActivities(),
    onMemberRemoved: () => fetchActivities(),
    onBoardUpdated: (boardDto) => {
      setBoard(prev => prev ? { ...prev, name: boardDto.name, description: boardDto.description || "", accentColor: boardDto.accentColor } : prev);
      fetchActivities();
    },
  });

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [b, actRes] = await Promise.all([
          getBoard(boardId),
          getActivityForBoard(boardId, currentPage - 1, pageSize),
        ]);
        if (isMounted) {
          setBoard(b);
          setActivities(actRes.entries);
          setTotalPages(Math.max(1, actRes.totalPages));
        }
      } catch {
        if (isMounted) setBoard(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (boardId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [boardId, currentPage, pageSize]);

  const uniqueActors = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach(a => map.set(a.actor.id, a.actor.fullName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  // Reset page when filter or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAction, selectedActor, pageSize]);

  // Selected Action Icon & Meta for dynamic trigger rendering
  const selectedActionMeta = selectedAction !== "ALL" ? ACTION_META[selectedAction] : null;
  const ActionIcon = selectedActionMeta ? selectedActionMeta.icon : ListFilter;
  const actionIconColor = selectedActionMeta ? selectedActionMeta.iconFg : "text-primary";

  // Selected Actor Obj for dynamic avatar rendering
  const selectedActorObj = useMemo(() => {
    return uniqueActors.find(a => a.id === selectedActor);
  }, [uniqueActors, selectedActor]);

  const pageEntries = useMemo(() => {
    return activities.filter(entry => {
      if (selectedAction !== "ALL" && entry.action !== selectedAction) return false;
      if (selectedActor !== "ALL" && entry.actor.id !== selectedActor) return false;
      return true;
    });
  }, [activities, selectedAction, selectedActor]);

  const total = pageEntries.length;

  const activeFilters = (selectedAction !== "ALL" ? 1 : 0) + (selectedActor !== "ALL" ? 1 : 0);
  const clearFilters = () => {
    setSelectedAction("ALL");
    setSelectedActor("ALL");
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Group current page entries by date
  const grouped = useMemo(() => {
    const map: { label: string; entries: ActivityEntry[] }[] = [];
    pageEntries.forEach(entry => {
      const d = new Date(entry.createdAt);
      const now = new Date();
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const label =
        d.toDateString() === now.toDateString()
          ? "Today"
          : d.toDateString() === yest.toDateString()
          ? "Yesterday"
          : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const last = map[map.length - 1];
      if (last && last.label === label) last.entries.push(entry);
      else map.push({ label, entries: [entry] });
    });
    return map;
  }, [pageEntries]);

  // Range calculation
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-outline">Loading activity feed...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <NotFoundState
        type="activity"
        title="Activity Log Unavailable"
        description="The board you're looking for doesn't exist, may have been deleted, or you don't have access permissions."
        resourceId={boardId}
        primaryAction={{
          label: "View All Boards",
          href: "/boards",
          icon: LayoutDashboard,
        }}
        secondaryAction={{
          label: "Search Workspace",
          href: "/search",
          icon: Search,
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-background">
      {/* ─── Top Header & Controls ───────────────────────────── */}
      <div className="shrink-0 px-4 md:px-8 pt-4 pb-3.5 border-b border-outline-variant/40 bg-surface/70 backdrop-blur-xl z-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-on-surface-variant font-[family-name:var(--font-mono)] text-[11px] mb-2.5 select-none">
          <Link href="/boards" className="hover:text-primary transition-colors">
            Boards
          </Link>
          <ChevronRight size={12} className="text-outline" />
          <Link href={`/boards/${boardId}`} className="hover:text-primary transition-colors truncate max-w-[160px]">
            {board.name}
          </Link>
          <ChevronRight size={12} className="text-outline" />
          <span className="text-on-surface font-semibold">Activity Feed</span>
        </div>

        {/* Title Bar & Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Title + Meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: board.accentColor ?? "var(--color-primary)" }}
            >
              <Activity size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-[family-name:var(--font-heading)] text-[20px] md:text-[24px] font-bold text-on-surface leading-tight tracking-tight">
                  Activity Feed
                </h1>
                <span className="font-[family-name:var(--font-mono)] text-[10.5px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                  {total} {total === 1 ? "event" : "events"}
                </span>
              </div>
              <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant truncate">
                Audit log of task updates, comments, priority shifts, and member activity.
              </p>
            </div>
          </div>

          {/* Filters & Page Size Selector */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* Action Filter Chip */}
            <Select value={selectedAction} onValueChange={v => v && setSelectedAction(v)}>
              <SelectTrigger className="h-7 w-auto min-w-[110px] bg-surface-low/90 hover:bg-surface-high/70 border border-outline-variant/50 text-on-surface text-[11.5px] font-medium rounded-lg shadow-none gap-1.5 px-2 transition-all">
                <ActionIcon size={12} className={cn("shrink-0 transition-colors", actionIconColor)} />
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  <div className="flex items-center gap-1.5">
                    <ListFilter size={12} className="text-outline" />
                    <span>All Actions</span>
                  </div>
                </SelectItem>
                <SelectItem value="TASK_MOVED">
                  <div className="flex items-center gap-1.5">
                    <LayoutDashboard size={12} className="text-tertiary" />
                    <span>Task Moved</span>
                  </div>
                </SelectItem>
                <SelectItem value="COMMENT_ADDED">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-primary" />
                    <span>Comment Added</span>
                  </div>
                </SelectItem>
                <SelectItem value="PRIORITY_CHANGED">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-error" />
                    <span>Priority Changed</span>
                  </div>
                </SelectItem>
                <SelectItem value="TASK_CREATED">
                  <div className="flex items-center gap-1.5">
                    <Plus size={12} className="text-secondary" />
                    <span>Task Created</span>
                  </div>
                </SelectItem>
                <SelectItem value="TASK_UPDATED">
                  <div className="flex items-center gap-1.5">
                    <Pencil size={12} className="text-primary" />
                    <span>Task Updated</span>
                  </div>
                </SelectItem>
                <SelectItem value="TASK_DELETED">
                  <div className="flex items-center gap-1.5">
                    <Trash2 size={12} className="text-error" />
                    <span>Task Deleted</span>
                  </div>
                </SelectItem>
                <SelectItem value="ASSIGNEE_CHANGED">
                  <div className="flex items-center gap-1.5">
                    <UserPlus size={12} className="text-tertiary" />
                    <span>Assignee Changed</span>
                  </div>
                </SelectItem>
                <SelectItem value="ATTACHMENT_ADDED">
                  <div className="flex items-center gap-1.5">
                    <Paperclip size={12} className="text-primary" />
                    <span>Attachment Added</span>
                  </div>
                </SelectItem>
                <SelectItem value="ATTACHMENT_REMOVED">
                  <div className="flex items-center gap-1.5">
                    <Paperclip size={12} className="text-error" />
                    <span>Attachment Removed</span>
                  </div>
                </SelectItem>
                <SelectItem value="MEMBER_INVITED">
                  <div className="flex items-center gap-1.5">
                    <UserPlus size={12} className="text-emerald-500" />
                    <span>Member Invited</span>
                  </div>
                </SelectItem>
                <SelectItem value="MEMBER_ADDED">
                  <div className="flex items-center gap-1.5">
                    <UserPlus size={12} className="text-emerald-500" />
                    <span>Member Joined</span>
                  </div>
                </SelectItem>
                <SelectItem value="MEMBER_ROLE_CHANGED">
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-tertiary" />
                    <span>Role Changed</span>
                  </div>
                </SelectItem>
                <SelectItem value="MEMBER_REMOVED">
                  <div className="flex items-center gap-1.5">
                    <UserMinus size={12} className="text-error" />
                    <span>Member Removed</span>
                  </div>
                </SelectItem>
                <SelectItem value="BOARD_CREATED">
                  <div className="flex items-center gap-1.5">
                    <LayoutDashboard size={12} className="text-primary" />
                    <span>Board Created</span>
                  </div>
                </SelectItem>
                <SelectItem value="BOARD_UPDATED">
                  <div className="flex items-center gap-1.5">
                    <LayoutDashboard size={12} className="text-primary" />
                    <span>Board Updated</span>
                  </div>
                </SelectItem>
                <SelectItem value="LIST_CREATED">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-secondary" />
                    <span>List Created</span>
                  </div>
                </SelectItem>
                <SelectItem value="LIST_RENAMED">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-secondary" />
                    <span>List Renamed</span>
                  </div>
                </SelectItem>
                <SelectItem value="LIST_DELETED">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-error" />
                    <span>List Deleted</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Member Filter Chip */}
            <Select value={selectedActor} onValueChange={v => v && setSelectedActor(v)}>
              <SelectTrigger className="h-7 w-auto min-w-[105px] bg-surface-low/90 hover:bg-surface-high/70 border border-outline-variant/50 text-on-surface text-[11.5px] font-medium rounded-lg shadow-none gap-1.5 px-2 transition-all">
                {selectedActor === "ALL" || !selectedActorObj ? (
                  <User size={12} className="text-secondary shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[8.5px] font-bold shrink-0">
                    {selectedActorObj.name.charAt(0)}
                  </div>
                )}
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-outline" />
                    <span>All Members</span>
                  </div>
                </SelectItem>
                {uniqueActors.map(a => {
                  const isSelf = Boolean(
                    user && (
                      a.id === user.id ||
                      a.id === user.email ||
                      (user.fullName && a.name.trim().toLowerCase() === user.fullName.trim().toLowerCase())
                    )
                  );
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[8.5px] font-bold shrink-0">
                          {a.name.charAt(0)}
                        </div>
                        <span className="truncate">{isSelf ? `${a.name} (You)` : a.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Page Size Selector with explicit label */}
            <div className="flex items-center gap-1 bg-surface-low/90 border border-outline-variant/50 rounded-lg px-2 h-7 shadow-none">
              <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-on-surface-variant font-medium whitespace-nowrap">
                Show:
              </span>
              <Select value={String(pageSize)} onValueChange={v => v && setPageSize(Number(v))}>
                <SelectTrigger className="h-5.5 w-auto min-w-[54px] bg-surface border border-outline-variant/40 text-on-surface font-semibold text-[11px] rounded-md px-1.5 shadow-none focus:ring-1 focus:ring-primary gap-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="5">5 logs</SelectItem>
                  <SelectItem value="10">10 logs</SelectItem>
                  <SelectItem value="20">20 logs</SelectItem>
                  <SelectItem value="50">50 logs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-on-surface-variant hover:text-error text-[11.5px] font-[family-name:var(--font-body)] font-medium px-2 py-1 rounded-lg hover:bg-error-container/20 transition-all cursor-pointer h-7"
                aria-label="Clear active filters"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Scrollable Feed Container ──────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-4"
      >
        <div className="max-w-3xl mx-auto pb-6">
          {pageEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-surface-low border border-dashed border-outline-variant flex items-center justify-center mb-3.5 text-outline shadow-2xs">
                <Filter size={22} strokeWidth={1.5} />
              </div>
              <p className="font-[family-name:var(--font-heading)] text-[17px] font-semibold text-on-surface mb-1">
                No activity found
              </p>
              <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant mb-4">
                No events match your selected filters for this board.
              </p>
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 bg-primary text-on-primary font-[family-name:var(--font-body)] text-[12.5px] font-semibold rounded-xl hover:brightness-110 transition-all cursor-pointer shadow-xs"
                >
                  Reset Filters
                </button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`page-${currentPage}-${selectedAction}-${selectedActor}-${pageSize}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-col gap-0"
              >
                {grouped.map((group, gi) => (
                  <div key={gi}>
                    <DateSeparator label={group.label} />

                    {/* Timeline */}
                    <div className="relative ml-4 sm:ml-5">
                      {/* Continuous vertical timeline connector line */}
                      <div className="absolute left-4.5 top-2 bottom-2 w-px bg-outline-variant/30" />

                      <div className="flex flex-col gap-0">
                        {group.entries.map((entry, idx) => {
                          const meta = getMeta(entry.action);
                          const IconComponent = meta.icon;
                          const initials = entry.actor.fullName
                            ? entry.actor.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                            : "?";

                          return (
                            <div
                              key={entry.id}
                              className="flex items-start gap-3 sm:gap-4 py-2.5 group relative"
                            >
                              {/* Actor Avatar + Action Badge */}
                              <div className="relative shrink-0 z-10">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-outline-variant/50 shadow-2xs bg-surface">
                                  {entry.actor.avatarUrl ? (
                                    <img
                                      src={entry.actor.avatarUrl}
                                      alt={entry.actor.fullName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-primary-fixed-dim flex items-center justify-center font-[family-name:var(--font-heading)] text-[11px] font-bold text-on-primary-fixed-variant">
                                      {initials}
                                    </div>
                                  )}
                                </div>

                                {/* Floating Action Sub-badge */}
                                <div
                                  className={cn(
                                    "absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-md border border-surface flex items-center justify-center shadow-2xs",
                                    meta.iconBg
                                  )}
                                >
                                  <IconComponent size={9} className={meta.iconFg} />
                                </div>
                              </div>

                              {/* Activity Event Card */}
                              <div className="flex-1 min-w-0 bg-surface/90 rounded-xl border border-outline-variant/50 p-3.5 hover:border-outline-variant/80 hover:shadow-xs transition-all">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-[family-name:var(--font-body)] text-[13.5px] text-on-surface-variant leading-snug">
                                      {getDescription(entry, boardId, user)}
                                    </p>
                                    {(() => {
                                      const commentSnippet = entry.metadata?.comment_snippet || entry.metadata?.commentSnippet || entry.metadata?.comment || entry.metadata?.content || entry.metadata?.snippet;
                                      return commentSnippet ? (
                                        <div className="mt-2 bg-surface-low rounded-lg p-2.5 border border-outline-variant/30">
                                          <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant italic leading-relaxed">
                                            &ldquo;{commentSnippet}&rdquo;
                                          </p>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={cn(
                                        "font-[family-name:var(--font-mono)] text-[9.5px] font-semibold px-2 py-0.5 rounded-md border hidden sm:block",
                                        meta.pillBg,
                                        meta.pillFg
                                      )}
                                    >
                                      {meta.label}
                                    </span>
                                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-outline">
                                      {formatTime(entry.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ─── Bottom Pagination Dock ─────────────────────────── */}
      {total > 0 && (
        <div className="shrink-0 border-t border-outline-variant/40 bg-surface/85 backdrop-blur-xl px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 z-10 select-none">
          {/* Range Summary */}
          <div className="flex items-center gap-2 text-[12.5px] font-[family-name:var(--font-body)] text-on-surface-variant">
            <span>
              Showing <strong className="font-semibold text-on-surface">{startItem}–{endItem}</strong> of{" "}
              <strong className="font-semibold text-on-surface">{total}</strong> events
            </span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            {/* First Page button (desktop) */}
            <SimpleTooltip content="First Page">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="hidden sm:flex p-1.5 rounded-lg border border-outline-variant/50 bg-surface hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none transition-colors text-on-surface cursor-pointer"
                aria-label="Go to first page"
              >
                <ChevronsLeft size={15} />
              </button>
            </SimpleTooltip>

            {/* Previous Page */}
            <SimpleTooltip content="Previous Page">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-outline-variant/50 bg-surface hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none transition-colors text-[12px] font-medium text-on-surface cursor-pointer"
                aria-label="Go to previous page"
              >
                <ChevronLeft size={15} />
                <span className="hidden xs:inline">Prev</span>
              </button>
            </SimpleTooltip>

            {/* Numbered Page Buttons */}
            <div className="flex items-center gap-1 px-1">
              {pageNumbers.map((p, idx) => {
                if (p === "ellipsis") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-7 h-7 flex items-center justify-center text-outline text-[12px] font-bold select-none"
                    >
                      …
                    </span>
                  );
                }

                const isActive = p === currentPage;
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    className={cn(
                      "w-7.5 h-7.5 rounded-lg text-[12px] font-[family-name:var(--font-mono)] font-semibold transition-all cursor-pointer flex items-center justify-center",
                      isActive
                        ? "bg-primary text-on-primary shadow-xs scale-105"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high/80 border border-transparent hover:border-outline-variant/40"
                    )}
                    aria-label={`Page ${p}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <SimpleTooltip content="Next Page">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-outline-variant/50 bg-surface hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none transition-colors text-[12px] font-medium text-on-surface cursor-pointer"
                aria-label="Go to next page"
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight size={15} />
              </button>
            </SimpleTooltip>

            {/* Last Page button (desktop) */}
            <SimpleTooltip content="Last Page">
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="hidden sm:flex p-1.5 rounded-lg border border-outline-variant/50 bg-surface hover:bg-surface-high disabled:opacity-30 disabled:pointer-events-none transition-colors text-on-surface cursor-pointer"
                aria-label="Go to last page"
              >
                <ChevronsRight size={15} />
              </button>
            </SimpleTooltip>
          </div>
        </div>
      )}
    </div>
  );
}
