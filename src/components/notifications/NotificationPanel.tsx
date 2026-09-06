"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCheck, UserCheck, Clock,
  ArrowRightLeft, Shield, Bell, Trash2, Loader2,
  MessageSquare, ChevronDown, Check,
} from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/services/notificationService";
import {
  acceptBoardInvite,
  declineBoardInvite,
  getBoards,
} from "@/services/boardService";
import { getMyTasks, getTasksForBoard } from "@/services/taskService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import UserAvatar from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { Notification, NotificationType, Task } from "@/lib/types";

interface NotificationPanelProps {
  onClose: () => void;
}

const PAGE_SIZE = 10;

// Date group categories
type DateGroup = "Today" | "Yesterday" | "Earlier this week" | "Older";

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }

  if (diffHours < 24 * 7) {
    return "Earlier this week";
  }

  return "Older";
}

function truncateText(text: string, maxLen: number = 28): string {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen).trimEnd()}…` : trimmed;
}

function isActionableInvite(notif: Notification): boolean {
  if (notif.type !== "INVITE") return false;
  const inviteId = (notif.payload?.invite_id as string | undefined) || (notif.payload?.inviteId as string | undefined);
  if (!inviteId) return false;
  const isAcceptedNotice =
    Boolean(notif.payload?.accepter_name || notif.payload?.accepterName) ||
    notif.title?.toLowerCase().includes("accepted") ||
    notif.payload?.status === "ACCEPTED";
  const isDeclinedNotice =
    Boolean(notif.payload?.decliner_name || notif.payload?.declinerName) ||
    notif.title?.toLowerCase().includes("declined") ||
    notif.payload?.status === "DECLINED";
  return !isAcceptedNotice && !isDeclinedNotice;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"accept" | "decline" | null>(null);

  // Load notifications and myTasks
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      setIsLoading(true);
      try {
        const res = await getNotifications(0, PAGE_SIZE);
        if (isMounted) {
          setNotificationsList(res.notifications);
          setHasMore(res.hasMore);
          setCurrentPage(0);
        }
        getMyTasks().then(tasks => {
          if (isMounted) setMyTasks(tasks);
        }).catch(() => {});
      } catch {
        // Handled
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-updated"));
      }
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotificationsList([]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-updated"));
      }
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const handleClearItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotificationsList(prev => prev.filter(n => n.id !== id));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }
    try {
      await deleteNotification(id);
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleItemClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await markNotificationAsRead(notif.id);
        setNotificationsList(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("notifications-updated"));
        }
      } catch {}
    }

    if (notif.linkTo && notif.linkTo.includes("/tasks/")) {
      onClose();
      router.push(notif.linkTo);
      return;
    }

    const shortCode = (notif.payload?.short_code as string) || (notif.payload?.shortCode as string);
    const taskId = (notif.payload?.taskId as string) || (notif.payload?.task_id as string);
    const boardId = (notif.payload?.boardId as string) || (notif.payload?.board_id as string);

    // If both boardId and taskId are already known
    if (boardId && taskId) {
      onClose();
      router.push(`/boards/${boardId}/tasks/${taskId}`);
      return;
    }

    const taskTitle = (notif.payload?.task_title as string) || (notif.payload?.taskTitle as string);

    // Resolve task by shortCode, taskId, or taskTitle
    if (shortCode || taskId || taskTitle || notif.type === "ASSIGNMENT" || notif.type === "COMMENT" || notif.type === "STATUS_CHANGE") {
      const isMatch = (t: Task) =>
        Boolean(
          (shortCode && t.shortCode?.trim().toLowerCase() === shortCode.trim().toLowerCase()) ||
          (taskId && t.id === taskId) ||
          (taskTitle && t.title?.trim().toLowerCase() === taskTitle.trim().toLowerCase())
        );

      // 1. Fast lookup from pre-loaded myTasks
      const match = myTasks.find(isMatch);
      if (match) {
        onClose();
        router.push(`/boards/${match.boardId}/tasks/${match.id}`);
        return;
      }

      // 2. Fresh fetch of myTasks
      try {
        const freshTasks = await getMyTasks();
        setMyTasks(freshTasks);
        const freshMatch = freshTasks.find(isMatch);
        if (freshMatch) {
          onClose();
          router.push(`/boards/${freshMatch.boardId}/tasks/${freshMatch.id}`);
          return;
        }

        // 3. Search user's boards
        const allBoards = await getBoards();
        for (const b of allBoards) {
          const bTasks = await getTasksForBoard(b.id, 0, 100);
          const bMatch = bTasks.find(isMatch);
          if (bMatch) {
            onClose();
            router.push(`/boards/${b.id}/tasks/${bMatch.id}`);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to resolve task for notification:", err);
      }
    }

    if (notif.linkTo) {
      onClose();
      router.push(notif.linkTo);
      return;
    }

    if (boardId) {
      onClose();
      router.push(`/boards/${boardId}`);
    }
  };

  const handleAcceptInvite = async (e: React.MouseEvent, notif: Notification) => {
    e.stopPropagation();
    if (processingInviteId === notif.id) return;

    const inviteId = (notif.payload?.invite_id as string | undefined) || (notif.payload?.inviteId as string | undefined);
    if (!inviteId) return;
    let targetBoardId = (notif.payload?.boardId as string | undefined) || (notif.payload?.board_id as string | undefined);

    setProcessingInviteId(notif.id);
    setProcessingAction("accept");

    try {
      if (inviteId) {
        const member = await acceptBoardInvite(inviteId);
        if (member && member.boardId) {
          targetBoardId = member.boardId;
        }
      }

      toast.success("Board invitation accepted!");

      // Delete the notification from UI and backend
      setNotificationsList(prev => prev.filter(n => n.id !== notif.id));
      try {
        await deleteNotification(notif.id);
      } catch {}

      // Update badge count and boards list
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-updated"));
        window.dispatchEvent(new CustomEvent("boards-updated"));
      }

      onClose();

      if (targetBoardId) {
        router.push(`/boards/${targetBoardId}`);
      } else if (notif.linkTo) {
        router.push(notif.linkTo);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept invitation";
      toast.error(msg);
      setProcessingInviteId(null);
      setProcessingAction(null);
    }
  };

  const handleDeclineInvite = async (e: React.MouseEvent, notif: Notification) => {
    e.stopPropagation();
    if (processingInviteId === notif.id) return;

    const inviteId = (notif.payload?.invite_id as string | undefined) || (notif.payload?.inviteId as string | undefined);
    if (!inviteId) return;

    setProcessingInviteId(notif.id);
    setProcessingAction("decline");

    try {
      if (inviteId) {
        await declineBoardInvite(inviteId);
      }

      toast.info("Board invitation declined");

      // Delete the notification from UI and backend
      setNotificationsList(prev => prev.filter(n => n.id !== notif.id));
      try {
        await deleteNotification(notif.id);
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-updated"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline invitation";
      toast.error(msg);
      setProcessingInviteId(null);
      setProcessingAction(null);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const res = await getNotifications(nextPage, PAGE_SIZE);
      setNotificationsList(prev => [...prev, ...res.notifications]);
      setHasMore(res.hasMore);
      setCurrentPage(nextPage);
    } catch {
      toast.error("Failed to load more notifications");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const getTypeMeta = (type: NotificationType) => {
    switch (type) {
      case "ASSIGNMENT":
        return { icon: UserCheck, color: "text-primary", bg: "bg-primary/10 border-primary/25" };
      case "COMMENT":
        return { icon: MessageSquare, color: "text-primary", bg: "bg-primary/15 border-primary/30" };
      case "DUE_SOON":
        return { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/15 border-amber-500/30" };
      case "STATUS_CHANGE":
        return { icon: ArrowRightLeft, color: "text-tertiary", bg: "bg-tertiary/15 border-tertiary/30" };
      case "INVITE":
        return { icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/15 border-emerald-500/30" };
      default:
        return { icon: Bell, color: "text-outline", bg: "bg-surface-high border-outline-variant" };
    }
  };

  const renderNotificationMessage = (notif: Notification) => {
    const shortCode = (notif.payload?.short_code as string) || (notif.payload?.shortCode as string);
    const assignerName = (notif.payload?.assigner_name as string) || (notif.payload?.assignerName as string) || (notif.payload?.actor_name as string) || (notif.payload?.actorName as string) || "Someone";

    if (notif.type === "ASSIGNMENT" && shortCode) {
      return (
        <span>
          <strong className="font-semibold text-on-surface">{assignerName}</strong> assigned you to{" "}
          <span className="inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] text-primary bg-primary/10 border border-primary/25 rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium shadow-2xs">
            {shortCode}
          </span>
        </span>
      );
    }

    if (notif.type === "COMMENT") {
      const commenterName =
        (notif.payload?.commenter_name as string) ||
        (notif.payload?.commenterName as string) ||
        (notif.payload?.author_name as string) ||
        (notif.payload?.actorName as string) ||
        "Someone";
      const taskTitle = (notif.payload?.task_title as string) || (notif.payload?.taskTitle as string) || "task";
      const snippet = (notif.payload?.comment_snippet as string) || (notif.payload?.commentSnippet as string);

      return (
        <div className="flex flex-col gap-1.5">
          <p className="leading-snug text-on-surface-variant">
            <strong className="font-semibold text-on-surface">{commenterName}</strong> commented on{" "}
            {shortCode ? (
              <span className="inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] text-primary bg-primary/10 border border-primary/25 rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium shadow-2xs group-hover:bg-primary/20 transition-colors">
                {shortCode}
              </span>
            ) : taskTitle ? (
              <span className="font-medium text-on-surface" title={taskTitle}>
                &ldquo;{truncateText(taskTitle, 28)}&rdquo;
              </span>
            ) : (
              <span className="font-medium text-on-surface">a task</span>
            )}
          </p>
          {snippet && (
            <div className="mt-0.5 px-2.5 py-1.5 rounded-lg bg-surface-low dark:bg-surface-high/60 border border-outline-variant/30 border-l-2 border-l-primary flex items-start gap-2 shadow-2xs group-hover:border-outline-variant/50 transition-colors">
              <MessageSquare size={11} className="text-primary shrink-0 mt-0.5" />
              <p className="font-[family-name:var(--font-body)] text-[11.5px] text-on-surface-variant italic leading-relaxed line-clamp-2 whitespace-pre-line break-words">
                &ldquo;{snippet.trim()}&rdquo;
              </p>
            </div>
          )}
        </div>
      );
    }

    if (notif.type === "STATUS_CHANGE") {
      const listName =
        (notif.payload?.to_list as string) ||
        (notif.payload?.toList as string) ||
        (notif.payload?.list_name as string) ||
        (notif.payload?.listName as string) ||
        "another list";
      const taskTitle =
        (notif.payload?.task_title as string) ||
        (notif.payload?.taskTitle as string) ||
        "Task";
      const moverName =
        (notif.payload?.mover_name as string) ||
        (notif.payload?.moverName as string) ||
        (notif.payload?.actor_name as string) ||
        (notif.payload?.actorName as string) ||
        (notif.payload?.user_name as string) ||
        (notif.payload?.userName as string);

      return (
        <span className="leading-relaxed">
          {moverName && <strong className="font-semibold text-on-surface">{moverName} </strong>}
          {moverName ? "moved " : ""}
          {shortCode ? (
            <span className="inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] text-primary bg-primary/10 border border-primary/25 rounded-md px-1.5 py-0.5 mx-0.5 align-baseline font-medium shadow-2xs">
              {shortCode}
            </span>
          ) : taskTitle ? (
            <span className="font-semibold text-on-surface mr-1" title={taskTitle}>
              &ldquo;{truncateText(taskTitle, 28)}&rdquo;
            </span>
          ) : (
            <span className="font-semibold text-on-surface mr-1">a task</span>
          )}
          {" "}
          {!moverName && "was moved "}to{" "}
          <span className="inline-flex items-center font-[family-name:var(--font-body)] text-[11.5px] font-semibold text-on-surface bg-surface-high border border-outline-variant/50 rounded-md px-1.5 py-0.5 mx-0.5 shadow-2xs">
            {listName}
          </span>
        </span>
      );
    }

    if (notif.type === "DUE_SOON") {
      const taskTitle = (notif.payload?.task_title as string) || (notif.payload?.taskTitle as string);
      const rawDays = notif.payload?.days_until_due ?? notif.payload?.daysUntilDue;
      const daysUntilDue =
        typeof rawDays === "number"
          ? rawDays
          : typeof rawDays === "string"
          ? parseInt(rawDays, 10)
          : undefined;

      let dueText = "due soon";
      let badgeLabel = "Due Soon";
      let badgeStyle = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";

      if (daysUntilDue === 0) {
        dueText = "due today";
        badgeLabel = "Due Today";
        badgeStyle = "bg-error/15 text-error border-error/30 animate-pulse";
      } else if (daysUntilDue === 1) {
        dueText = "due tomorrow";
        badgeLabel = "Due Tomorrow";
        badgeStyle = "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold";
      } else if (daysUntilDue === 2) {
        dueText = "due in 2 days";
        badgeLabel = "Due in 2 days";
        badgeStyle = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      } else if (typeof daysUntilDue === "number" && daysUntilDue > 2) {
        dueText = `due in ${daysUntilDue} days`;
        badgeLabel = `Due in ${daysUntilDue} days`;
        badgeStyle = "bg-surface-high text-on-surface-variant border-outline-variant/50";
      }

      return (
        <div className="flex flex-col gap-1.5">
          <p className="leading-snug text-on-surface-variant">
            {shortCode && (
              <span className="inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] text-primary bg-primary/10 border border-primary/25 rounded-md px-1.5 py-0.5 mr-1 align-baseline font-medium shadow-2xs">
                {shortCode}
              </span>
            )}
            {taskTitle ? (
              <span className="font-semibold text-on-surface mr-1" title={taskTitle}>
                &ldquo;{truncateText(taskTitle, 28)}&rdquo;
              </span>
            ) : !shortCode ? (
              <span className="font-medium text-on-surface">Task </span>
            ) : null}
            <span>is {dueText}</span>
          </p>

          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-[family-name:var(--font-mono)] text-[10.5px] border shadow-2xs",
                badgeStyle
              )}
            >
              <Clock size={10} className="shrink-0" />
              <span>{badgeLabel}</span>
            </span>
          </div>
        </div>
      );
    }

    return <span>{notif.message}</span>;
  };

  const notifications = useMemo(() => {
    return filter === "UNREAD" ? notificationsList.filter(n => !n.isRead) : notificationsList;
  }, [filter, notificationsList]);
  const unreadCount = useMemo(() => notificationsList.filter(n => !n.isRead).length, [notificationsList]);
  const totalCount = notificationsList.length;

  // Group notifications into Facebook-style time sections
  const groupedNotifications = useMemo(() => {
    const groups: Record<DateGroup, Notification[]> = {
      Today: [],
      Yesterday: [],
      "Earlier this week": [],
      Older: [],
    };

    notifications.forEach((n) => {
      const g = getDateGroup(n.createdAt);
      groups[g].push(n);
    });

    return (["Today", "Yesterday", "Earlier this week", "Older"] as DateGroup[])
      .filter((g) => groups[g].length > 0)
      .map((g) => ({
        label: g,
        items: groups[g],
      }));
  }, [notifications]);

  return (
    <>
      {/* Mobile backdrop */}
      <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" />

      {/* Floating Panel Container */}
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="fixed top-16 right-3 sm:right-6 left-3 sm:left-auto w-auto sm:w-[420px] z-50 flex flex-col max-h-[85vh] bg-surface/95 dark:bg-surface/95 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden select-none"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="px-4 py-3.5 border-b border-outline-variant/30 flex items-center justify-between shrink-0 bg-surface/50">
          <div className="flex items-center gap-2">
            <h3 className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-on-surface">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="font-[family-name:var(--font-mono)] text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <SimpleTooltip content="Mark all as read">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium font-[family-name:var(--font-body)] text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  aria-label="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              </SimpleTooltip>
            )}
            <SimpleTooltip content="Close notifications">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-high rounded-lg transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </SimpleTooltip>
          </div>
        </div>

        {/* ── Filter Tabs ────────────────────────────────────── */}
        <div className="px-4 py-2 border-b border-outline-variant/20 flex items-center justify-between bg-surface-low/50 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={cn(
                "px-3 py-1 rounded-lg text-[12px] font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer",
                filter === "ALL"
                  ? "bg-surface text-on-surface shadow-2xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("UNREAD")}
              className={cn(
                "px-3 py-1 rounded-lg text-[12px] font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer",
                filter === "UNREAD"
                  ? "bg-surface text-on-surface shadow-2xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline">
            Showing {notifications.length} of {totalCount}
          </span>
        </div>

        {/* ── Scrollable Notifications List ──────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-14 px-6 flex flex-col items-center justify-center text-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-surface-high flex items-center justify-center text-outline shadow-2xs">
                <CheckCheck size={22} />
              </div>
              <p className="font-[family-name:var(--font-heading)] text-[14.5px] font-semibold text-on-surface">
                {filter === "UNREAD" ? "No unread notifications" : "All caught up!"}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant max-w-[240px] leading-relaxed">
                {filter === "UNREAD"
                  ? "You have reviewed all your pending alerts and mentions."
                  : "New assignments, comments, and task updates will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/15">
              {groupedNotifications.map((group) => (
                <div key={group.label} className="flex flex-col">
                  {/* Facebook-style Group Header */}
                  <div className="px-4 py-2 bg-surface-low/60 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/10">
                    <span className="font-[family-name:var(--font-heading)] text-[12px] font-bold text-on-surface">
                      {group.label}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline font-medium">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Group Items */}
                  <div className="divide-y divide-outline-variant/10">
                    <AnimatePresence initial={false}>
                      {group.items.map((notif) => {
                        const meta = getTypeMeta(notif.type);
                        const IconComponent = meta.icon;

                        return (
                          <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => handleItemClick(notif)}
                            className={cn(
                              "group relative p-3.5 flex gap-3 hover:bg-surface-high/60 transition-all cursor-pointer",
                              !notif.isRead
                                ? "bg-primary/[0.04] dark:bg-primary/[0.06]"
                                : "bg-surface"
                            )}
                          >
                            {/* Unread indicator pill */}
                            {!notif.isRead && (
                              <span className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                            )}

                            {/* Icon / Actor Avatar */}
                            <div className="relative shrink-0">
                              {notif.actor ? (
                                <UserAvatar
                                  userId={notif.actor.id || notif.actorId}
                                  fullName={notif.actor.fullName}
                                  avatarUrl={notif.actor.avatarUrl}
                                  size={36}
                                  rounded="full"
                                  className="border-outline-variant/60 shadow-2xs"
                                />
                              ) : (
                                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center border shadow-2xs", meta.bg)}>
                                  <IconComponent size={15} className={meta.color} />
                                </div>
                              )}

                              {/* Small type badge overlay if actor has avatar */}
                              {notif.actor && (
                                <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-surface shadow-2xs", meta.bg)}>
                                  <IconComponent size={9} className={meta.color} />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <p className={cn(
                                  "font-[family-name:var(--font-body)] text-[13px] leading-snug truncate",
                                  !notif.isRead ? "font-bold text-on-surface" : "font-medium text-on-surface/90"
                                )}>
                                  {notif.title}
                                </p>
                                <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline shrink-0">
                                  {formatTime(notif.createdAt)}
                                </span>
                              </div>

                              <div className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant leading-relaxed">
                                {renderNotificationMessage(notif)}
                              </div>

                              {/* Invite Actions: Accept / Decline */}
                              {isActionableInvite(notif) && (
                                <div className="flex items-center gap-2 mt-2 select-none">
                                  <button
                                    type="button"
                                    disabled={processingInviteId === notif.id}
                                    onClick={(e) => handleAcceptInvite(e, notif)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-[family-name:var(--font-body)] text-[11.5px] font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {processingInviteId === notif.id && processingAction === "accept" ? (
                                      <>
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Accepting…</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check size={13} />
                                        <span>Accept</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={processingInviteId === notif.id}
                                    onClick={(e) => handleDeclineInvite(e, notif)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-low hover:bg-surface-high text-on-surface-variant hover:text-error border border-outline-variant/40 font-[family-name:var(--font-body)] text-[11.5px] font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {processingInviteId === notif.id && processingAction === "decline" ? (
                                      <>
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Declining…</span>
                                      </>
                                    ) : (
                                      <>
                                        <X size={12} />
                                        <span>Decline</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Dismiss button on hover */}
                            <SimpleTooltip content="Dismiss">
                              <button
                                type="button"
                                onClick={(e) => handleClearItem(e, notif.id)}
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-outline hover:text-error hover:bg-error-container/20 rounded-md transition-all self-start shrink-0 cursor-pointer"
                                aria-label="Dismiss notification"
                              >
                                <X size={13} />
                              </button>
                            </SimpleTooltip>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}

              {/* ─── Facebook-style "Load More / Previous" Pagination Action ──── */}
              <div className="p-3 bg-surface-low/30 border-t border-outline-variant/15 flex flex-col items-center justify-center gap-1">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full py-2 px-3 rounded-xl bg-surface-low hover:bg-surface-high text-primary font-[family-name:var(--font-body)] text-[12.5px] font-semibold flex items-center justify-center gap-2 border border-outline-variant/40 transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-60"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-primary" />
                        <span>Loading previous notifications...</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        <span>See previous notifications</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-outline py-1">
                    <Check size={13} className="text-emerald-500" />
                    <span className="font-[family-name:var(--font-body)] text-[11.5px] font-medium">
                      You&apos;re all caught up
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-outline-variant/30 bg-surface-low/50 flex items-center justify-between shrink-0">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-outline">
            {totalCount} total {filter === "UNREAD" ? "unread" : "notifications"}
          </span>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 text-[11.5px] font-[family-name:var(--font-body)] font-medium text-on-surface-variant hover:text-error transition-colors cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
