"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Calendar, Paperclip, Send, History,
  Upload, Trash2, AlertTriangle, Pencil, Check, Plus,
  Tags, LayoutDashboard, MessageSquare, AlignLeft, User as UserIcon,
  CheckCircle2, Circle, Clock, FileText, ImageIcon,
  FileCode, FileArchive, File as FileGenericIcon, X,
  PanelRightClose, PanelRightOpen, ChevronDown, Search,
  Volume2, VolumeX,
} from "lucide-react";
import {
  playMessageSentSound,
  playDeleteSound,
  isChatSoundEnabled,
  setChatSoundEnabled,
} from "@/lib/soundEffects";
import Link from "next/link";
import type { Task, Priority, Comment, Attachment, ActivityEntry, Label, TaskList, User, Board } from "@/lib/types";
import { getBoard, getBoardMembers } from "@/services/boardService";
import { getTaskById, getTaskListsForBoard, updateTask, moveTask, deleteTask } from "@/services/taskService";
import { getCommentsForTask, createComment, updateComment, deleteComment } from "@/services/commentService";
import { getAttachmentsForTask, uploadAttachment, deleteAttachment, downloadAttachment } from "@/services/attachmentService";
import { getActivitiesForTask } from "@/services/activityService";
import { getLabelsForBoard, assignLabelsToTask } from "@/services/labelService";
import { useBoardWebSocket } from "@/hooks/useBoardWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MessageRenderer from "@/components/chat/MessageRenderer";
import UserAvatar from "@/components/ui/UserAvatar";
import RichComposer, { type RichComposerHandle } from "@/components/chat/RichComposer";
import NotFoundState from "@/components/ui/NotFoundState";
import DatePicker from "@/components/ui/DatePicker";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Column Status Color Helper ─────────────────────────────
function getListColor(listName?: string) {
  if (!listName) return "bg-slate-400";
  const lower = listName.toLowerCase();
  if (lower.includes("done") || lower.includes("completed")) return "bg-emerald-500";
  if (lower.includes("progress") || lower.includes("doing") || lower.includes("active")) return "bg-primary";
  if (lower.includes("review") || lower.includes("testing") || lower.includes("qa")) return "bg-amber-500";
  return "bg-slate-400";
}

// ─── Priority config ────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  LOW:    { label: "Low",      color: "text-secondary font-medium",          bg: "bg-secondary/10 border-secondary/25",  dot: "bg-secondary" },
  MEDIUM: { label: "Medium",   color: "text-tertiary font-medium",           bg: "bg-tertiary/10 border-tertiary/25",    dot: "bg-tertiary" },
  HIGH:   { label: "High",     color: "text-error font-medium",              bg: "bg-error/10 border-error/25",          dot: "bg-error" },
  URGENT: { label: "Urgent",   color: "text-error font-bold",                bg: "bg-error/20 border-error/40",          dot: "bg-error" },
};

const NO_PRIORITY_CONFIG = {
  label: "None",
  color: "text-outline",
  bg: "bg-surface-low border-outline-variant/40",
  dot: "bg-outline/40",
};

// ─── Activity helpers ───────────────────────────────────────
type ActivityIconProps = { action: string };
function ActivityIcon({ action }: ActivityIconProps) {
  if (action.includes("COMMENT"))  return <MessageSquare size={12} />;
  if (action.includes("PRIORITY")) return <AlertTriangle size={12} />;
  if (action.includes("MOVED") || action.includes("STATUS")) return <LayoutDashboard size={12} />;
  if (action.includes("ASSIGN"))   return <UserIcon size={12} />;
  if (action.includes("ATTACHMENT")) return <Paperclip size={12} />;
  if (action.includes("LABEL"))    return <Tags size={12} />;
  return <History size={12} />;
}

function activityColor(action: string): string {
  if (action.includes("COMMENT"))  return "bg-primary/10 text-primary";
  if (action.includes("PRIORITY")) return "bg-error/10 text-error";
  if (action.includes("MOVED"))    return "bg-tertiary/10 text-tertiary";
  if (action.includes("ATTACH"))   return "bg-secondary/10 text-secondary";
  return "bg-outline-variant/40 text-on-surface-variant";
}

// ─── File Icon Helper ───────────────────────────────────────
function getFileIcon(fileName: string, mimeType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || mimeType?.startsWith("image/")) {
    return <ImageIcon size={16} className="text-secondary" />;
  }
  if (["js", "ts", "tsx", "jsx", "html", "css", "json", "py", "sql"].includes(ext)) {
    return <FileCode size={16} className="text-tertiary" />;
  }
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
    return <FileArchive size={16} className="text-amber-500" />;
  }
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
    return <FileText size={16} className="text-primary" />;
  }
  return <FileGenericIcon size={16} className="text-outline" />;
}

// ─── Helpers ───────────────────────────────────────────────
function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateGroupLabel(dateStr?: string): string {
  const now = new Date();
  if (!dateStr) return "Today";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatRelative(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diffMs  = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function activitySummary(entry: { action: string; actor: { fullName: string }; metadata?: Record<string, string> }): { actor: string; text: string } {
  const name = entry.actor.fullName.split(" ")[0];
  switch (entry.action) {
    case "TASK_MOVED":         return { actor: name, text: `moved this from **${entry.metadata?.from ?? "—"}** → **${entry.metadata?.to ?? "—"}**` };
    case "PRIORITY_CHANGED":   return { actor: name, text: `changed priority from **${entry.metadata?.from ?? "—"}** to **${entry.metadata?.to ?? "—"}**` };
    case "ASSIGNEE_CHANGED":   return { actor: name, text: "changed the assignee" };
    case "TASK_CREATED":       return { actor: name, text: "created this task" };
    case "TASK_UPDATED":       return { actor: name, text: "updated this task" };
    case "ATTACHMENT_ADDED":   return { actor: name, text: "uploaded a file" };
    case "ATTACHMENT_REMOVED": return { actor: name, text: "removed a file" };
    case "COMMENT_ADDED":      return { actor: name, text: "left a comment" };
    default:                   return { actor: name, text: "made a change" };
  }
}

function ActivityText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} className="font-semibold text-on-surface">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// ─── Page Component ───────────────────────────────────────
export default function TaskDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const boardId  = params.boardId as string;
  const taskId   = params.taskId  as string;

  const { getUserBoardRole, user, setUserBoardRole } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [boardLabels, setBoardLabels] = useState<Label[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [attachmentsList, setAttachmentsList] = useState<Attachment[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner  = (user && board && (board.ownerId === user.id || board.ownerId === user.email)) || getUserBoardRole(boardId) === "OWNER";
  const role     = isOwner ? "OWNER" : (getUserBoardRole(boardId) ?? "MEMBER");
  const canEdit  = role ? hasPermission(role, "EDIT_TASK")  : false;
  const canComment = role ? hasPermission(role, "COMMENT")  : false;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText,      setTitleText]      = useState("");
  const [isEditingDesc,  setIsEditingDesc]  = useState(false);
  const [descText,       setDescText]       = useState("");

  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);

  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);

  const [commentText, setCommentText] = useState("");
  const [activeTab,   setActiveTab]   = useState<"details" | "thread">("details");
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const threadEndRef  = useRef<HTMLDivElement>(null);
  const composerRef   = useRef<RichComposerHandle>(null);

  // Load task and board resources asynchronously
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [b, t, lists, lbls, mbrs, cmts, atts, acts] = await Promise.all([
          getBoard(boardId),
          getTaskById(taskId),
          getTaskListsForBoard(boardId),
          getLabelsForBoard(boardId),
          getBoardMembers(boardId),
          getCommentsForTask(taskId),
          getAttachmentsForTask(taskId),
          getActivitiesForTask(taskId),
        ]);

        if (isMounted) {
          const users = mbrs.map(m => m.user);
          const taskWithAssignee = t.assignee
            ? t
            : t.assigneeId
              ? { ...t, assignee: users.find(u => u.id === t.assigneeId || u.email === t.assigneeId) }
              : t;

          setBoard(b);
          setCurrentTask(taskWithAssignee);
          setTitleText(t.title);
          setDescText(t.description || "");
          setTaskLists(lists);
          setBoardLabels(lbls);
          setAllUsers(users);
          setCommentsList(cmts);
          setAttachmentsList(atts);
          setActivities(acts);

          const isOwner = user && (b.ownerId === user.id || b.ownerId === user.email);
          const myMembership = mbrs.find(m => m.userId === user?.id || m.user?.email === user?.email);
          if (isOwner) {
            setUserBoardRole(boardId, "OWNER");
          } else if (myMembership) {
            setUserBoardRole(boardId, myMembership.role);
          }
        }
      } catch {
        if (isMounted) {
          setCurrentTask(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (boardId && taskId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [boardId, taskId, user?.id, user?.email, setUserBoardRole]);

  // Connect STOMP WebSocket for real-time live synchronization (§6)
  useBoardWebSocket(boardId, {
    onTaskUpdated: (task) => {
      if (task.id === taskId) {
        setCurrentTask(task);
        setTitleText(task.title);
        setDescText(task.description || "");
        getActivitiesForTask(taskId).then(setActivities).catch(() => {});
      }
    },
    onTaskLabelsChanged: (tid, labels) => {
      if (tid === taskId) {
        setCurrentTask((prev) => (prev ? { ...prev, labelIds: labels.map((l) => l.id), labels } : prev));
        getActivitiesForTask(taskId).then(setActivities).catch(() => {});
      }
    },
    onLabelUpdated: (updatedLabel) => {
      setBoardLabels((prev) => prev.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)));
      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              labels: prev.labels?.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)),
            }
          : prev
      );
    },
    onLabelDeleted: (labelId) => {
      setBoardLabels((prev) => prev.filter((l) => l.id !== labelId));
      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              labelIds: prev.labelIds?.filter((id) => id !== labelId),
              labels: prev.labels?.filter((l) => l.id !== labelId),
            }
          : prev
      );
    },
    onTaskDeleted: (tid) => {
      if (tid === taskId) {
        toast.error("This task was deleted");
        router.push(`/boards/${boardId}`);
      }
    },
    onCommentAdded: (comment) => {
      if (comment.taskId === taskId) {
        setCommentsList((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
        if (comment.authorId !== user?.id) {
          playMessageSentSound();
        }
      }
    },
    onCommentUpdated: (comment) => {
      if (comment.taskId === taskId) {
        setCommentsList((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
      }
    },
    onCommentDeleted: (commentId) => {
      setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
    },
    onAttachmentAdded: (attachment) => {
      if (attachment.taskId === taskId) {
        setAttachmentsList((prev) => (prev.some((a) => a.id === attachment.id) ? prev : [...prev, attachment]));
        getActivitiesForTask(taskId).then(setActivities).catch(() => {});
      }
    },
    onAttachmentRemoved: (attachmentId) => {
      setAttachmentsList((prev) => prev.filter((a) => a.id !== attachmentId));
      getActivitiesForTask(taskId).then(setActivities).catch(() => {});
    },
  });

  // Read saved discussion panel preference & sound preference on mount
  useEffect(() => {
    setSoundEnabled(isChatSoundEnabled());
    const saved = localStorage.getItem("taskflow-task-discussion-open");
    if (saved !== null) {
      setIsDiscussionOpen(saved === "true");
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setChatSoundEnabled(next);
    if (next) {
      playMessageSentSound();
      toast.success("Chat sounds enabled");
    } else {
      toast.info("Chat sounds muted");
    }
  };

  if (!loading && !board) {
    return (
      <NotFoundState
        type="board"
        title="Board Not Found"
        description="The board containing this task doesn't exist, may have been deleted, or you don't have access permissions."
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

  if (!loading && !currentTask) {
    return (
      <NotFoundState
        type="task"
        title="Task Not Found"
        description="We couldn't find this task. It may have been completed and archived, deleted, or the URL might be mistyped."
        resourceId={taskId}
        primaryAction={{
          label: `Back to Boards`,
          href: `/boards/${boardId}`,
          icon: ArrowLeft,
        }}
        secondaryAction={{
          label: "Search Workspace",
          href: "/search",
          icon: Search,
        }}
      />
    );
  }

  if (loading || !currentTask || !board) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-outline">Loading task...</p>
        </div>
      </div>
    );
  }

  const currentList    = taskLists.find(l => l.id === currentTask.listId);
  const isDone         = currentList?.name === "Done";
  const priorityConfig = (currentTask.priority && PRIORITY_CONFIG[currentTask.priority])
    ? PRIORITY_CONFIG[currentTask.priority]
    : NO_PRIORITY_CONFIG;

  // ─── Handlers ──────────────────────────────────────────
  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!currentTask) return;

    // Check if any actual field changed
    const hasStatusChange   = updates.listId !== undefined && updates.listId !== currentTask.listId;
    const hasPriorityChange = updates.priority !== undefined && updates.priority !== currentTask.priority;
    const hasAssigneeChange = updates.assigneeId !== undefined && (updates.assigneeId || undefined) !== (currentTask.assigneeId || undefined);
    const hasDueDateChange  = updates.dueDate !== undefined && (updates.dueDate || undefined) !== (currentTask.dueDate || undefined);
    const hasTitleChange    = updates.title !== undefined && updates.title.trim() !== currentTask.title.trim();
    const hasDescChange     = updates.description !== undefined && (updates.description ?? "").trim() !== (currentTask.description ?? "").trim();
    const hasLabelChange    = updates.labelIds !== undefined && (
      updates.labelIds.length !== (currentTask.labelIds?.length ?? 0) ||
      !updates.labelIds.every(id => currentTask.labelIds?.includes(id))
    );

    const hasAnyChange =
      hasStatusChange ||
      hasPriorityChange ||
      hasAssigneeChange ||
      hasDueDateChange ||
      hasTitleChange ||
      hasDescChange ||
      hasLabelChange;

    // If user selected the already-active option or nothing changed, silently no-op
    if (!hasAnyChange) return;

    try {
      let updatedTask: Task = currentTask;

      // If moving to a different list
      if (hasStatusChange && updates.listId) {
        const moved = await moveTask({
          taskId: currentTask.id,
          taskListId: updates.listId,
          position: 0,
        });
        if (moved) {
          updatedTask = { ...updatedTask, listId: updates.listId };
        }
      }

      // Check if other task metadata fields changed
      const otherUpdates = { ...updates };
      delete otherUpdates.listId;
      const hasOtherUpdates = Object.keys(otherUpdates).length > 0;

      if (hasOtherUpdates) {
        const updated = await updateTask(currentTask.id, otherUpdates);
        if (updated) {
          updatedTask = { ...updatedTask, ...updated };
        }
      }

      const assignee = updates.assigneeId !== undefined
        ? allUsers.find(u => u.id === updates.assigneeId)
        : currentTask.assignee;
      const labels = updates.labelIds !== undefined
        ? boardLabels.filter(l => updates.labelIds?.includes(l.id))
        : currentTask.labels;

      setCurrentTask(prev => prev ? { ...prev, ...updatedTask, listId: updates.listId ?? prev.listId, assignee, labels } : prev);
      if (updates.description !== undefined) {
        setDescText(updates.description);
      }
      getActivitiesForTask(currentTask.id).then(setActivities).catch(() => {});
      toast.success(hasStatusChange ? "Task moved" : "Task updated");
    } catch {
      toast.error(hasStatusChange ? "Failed to move task" : "Failed to update task");
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentTask.shortCode);
    toast.success("Task ID copied!");
  };

  const handleToggleDone = () => {
    const doneList = taskLists.find(l => l.name === "Done");
    const todoList = taskLists.find(l => l.name === "To Do" || l.name === "Backlog") ?? taskLists[0];
    if (isDone && todoList) {
      handleTaskUpdate({ listId: todoList.id });
    } else if (!isDone && doneList) {
      handleTaskUpdate({ listId: doneList.id });
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment);
    setCommentText(comment.content);
    setTimeout(() => {
      composerRef.current?.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setCommentText("");
    composerRef.current?.clear();
  };

  const handleComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    if (editingComment) {
      if (trimmed === editingComment.content.trim()) {
        return; // Unchanged: user must make changes or click Cancel
      }
      try {
        const updated = await updateComment(editingComment.id, trimmed);
        if (updated) {
          setCommentsList(prev => prev.map(c => c.id === editingComment.id ? { ...c, ...updated } : c));
          playMessageSentSound();
          toast.success("Comment updated");
        }
      } catch {
        toast.error("Failed to update comment");
      } finally {
        handleCancelEdit();
      }
    } else {
      try {
        const created = await createComment(currentTask.id, trimmed);
        const resolvedComment: Comment = {
          ...created,
          createdAt: created.createdAt || new Date().toISOString(),
          authorId: created.authorId || user?.id || "",
          author: {
            ...created.author,
            id: created.author?.id || user?.id || "",
            fullName: created.author?.fullName && created.author.fullName !== "Team Member" ? created.author.fullName : (user?.fullName || "You"),
            avatarUrl: created.author?.avatarUrl || user?.avatarUrl,
          },
        };
        setCommentsList(prev => (prev.some(c => c.id === resolvedComment.id) ? prev : [...prev, resolvedComment]));
        setCommentText("");
        composerRef.current?.clear();
        playMessageSentSound();
        toast.success("Comment posted!");
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } catch {
        toast.error("Failed to post comment");
      }
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment(commentToDelete.id);
      setCommentsList(prev => prev.filter(c => c.id !== commentToDelete.id));
      playDeleteSound();
      if (editingComment?.id === commentToDelete.id) {
        handleCancelEdit();
      }
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setCommentToDelete(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentTask) return;
    try {
      let uploadedCount = 0;
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 10 * 1024 * 1024) {
          toast.error(`"${files[i].name}" exceeds the maximum 10MB upload limit.`);
          continue;
        }
        const att = await uploadAttachment(currentTask.id, files[i]);
        setAttachmentsList(prev => (prev.some(a => a.id === att.id) ? prev : [...prev, att]));
        uploadedCount++;
      }
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount === 1 ? "File" : `${uploadedCount} files`} uploaded`);
        getActivitiesForTask(currentTask.id).then(setActivities).catch(() => {});
      }
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      e.target.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0 || !currentTask) return;
    try {
      let uploadedCount = 0;
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 10 * 1024 * 1024) {
          toast.error(`"${files[i].name}" exceeds the maximum 10MB upload limit.`);
          continue;
        }
        const att = await uploadAttachment(currentTask.id, files[i]);
        setAttachmentsList(prev => (prev.some(a => a.id === att.id) ? prev : [...prev, att]));
        uploadedCount++;
      }
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount === 1 ? "File" : `${uploadedCount} files`} uploaded`);
        getActivitiesForTask(currentTask.id).then(setActivities).catch(() => {});
      }
    } catch {
      toast.error("Failed to upload attachment");
    }
  };

  const handleDeleteAttachment = async (id: string, name: string) => {
    if (!currentTask) return;
    try {
      await deleteAttachment(id);
      setAttachmentsList(prev => prev.filter(a => a.id !== id));
      getActivitiesForTask(currentTask.id).then(setActivities).catch(() => {});
      toast.success(`Deleted ${name}`);
    } catch {
      toast.error(`Failed to delete ${name}`);
    }
  };

  const handleDeleteTask = async () => {
    try {
      await deleteTask(currentTask.id);
      toast.success(`Deleted "${currentTask.title}"`);
      router.push(`/boards/${boardId}`);
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const toggleLabel = async (labelId: string) => {
    const currentIds = currentTask.labelIds || [];
    const newIds = currentIds.includes(labelId)
      ? currentIds.filter(id => id !== labelId)
      : [...currentIds, labelId];

    try {
      await assignLabelsToTask(currentTask.id, newIds);
      const newLabels = boardLabels.filter(l => newIds.includes(l.id));
      setCurrentTask(prev => prev ? { ...prev, labelIds: newIds, labels: newLabels } : prev);
      toast.success("Labels updated");
    } catch {
      toast.error("Failed to update labels");
    }
  };

  // ─── Build merged thread (activity + comments) ──────────
  type ThreadItem =
    | { kind: "activity"; id: string; createdAt: string; entry: typeof activities[0] }
    | { kind: "comment";  id: string; createdAt: string; comment: Comment };

  const thread: ThreadItem[] = [
    ...activities
      .filter(e => e.action !== "COMMENT_ADDED" && e.action !== "COMMENT_UPDATED" && e.action !== "COMMENT_DELETED")
      .map(e => ({ kind: "activity" as const, id: e.id, createdAt: e.createdAt || new Date().toISOString(), entry: e })),
    ...commentsList.map(c  => ({ kind: "comment"  as const, id: c.id, createdAt: c.createdAt || new Date().toISOString(), comment: c })),
  ].sort((a, b) => {
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    return (isNaN(tA) ? Date.now() : tA) - (isNaN(tB) ? Date.now() : tB);
  });

  // ─── Left column: task metadata ────────────────────────
  const detailsPanelJSX = (
    <div className="flex flex-col gap-6">

      {/* ─── Hero Header: Badge + Done Toggle + Title + Labels ─── */}
      <div className="flex flex-col gap-3">
        {/* Top badge row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Shortcode chip with Copy */}
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-low border border-outline-variant/60 hover:bg-surface-high text-on-surface font-[family-name:var(--font-mono)] text-[11px] font-semibold tracking-wider transition-all cursor-pointer group shadow-2xs"
            >
              <span>{currentTask.shortCode}</span>
              <Copy size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Quick Done toggle */}
            {canEdit && (
              <button
                onClick={handleToggleDone}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-[family-name:var(--font-body)] text-[11.5px] font-medium transition-all cursor-pointer border shadow-2xs",
                  isDone
                    ? "bg-secondary/15 border-secondary/30 text-secondary"
                    : "bg-surface-low border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-high"
                )}
              >
                {isDone ? <CheckCircle2 size={13} className="text-secondary" /> : <Circle size={13} />}
                <span>{isDone ? "Completed" : "Mark Done"}</span>
              </button>
            )}
          </div>

          <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline">
            {formatRelative(currentTask.updatedAt)}
          </span>
        </div>

        {/* Task Title */}
        {canEdit && isEditingTitle ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={titleText}
              onChange={e => setTitleText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  setIsEditingTitle(false);
                  if (titleText.trim() && titleText.trim() !== currentTask.title.trim()) {
                    handleTaskUpdate({ title: titleText.trim() });
                  } else {
                    setTitleText(currentTask.title);
                  }
                } else if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setTitleText(currentTask.title);
                }
              }}
              className="flex-1 font-[family-name:var(--font-heading)] text-[22px] font-bold text-on-surface bg-surface-low border-2 border-primary rounded-xl px-3 py-1.5 focus:outline-none shadow-xs"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setIsEditingTitle(false);
                setTitleText(currentTask.title);
              }}
              className="p-2 bg-surface-low hover:bg-surface-high text-on-surface-variant hover:text-on-surface rounded-xl transition-colors cursor-pointer shrink-0 border border-outline-variant/40 shadow-xs"
              aria-label="Cancel editing title"
            >
              <X size={16} />
            </button>
            <button
              type="button"
              disabled={!titleText.trim() || titleText.trim() === currentTask.title.trim()}
              onClick={() => {
                if (titleText.trim() && titleText.trim() !== currentTask.title.trim()) {
                  setIsEditingTitle(false);
                  handleTaskUpdate({ title: titleText.trim() });
                }
              }}
              className="p-2 bg-primary text-on-primary rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
              aria-label="Save title"
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 group/title">
            <h1
              onClick={() => canEdit && setIsEditingTitle(true)}
              className={cn(
                "font-[family-name:var(--font-heading)] text-[22px] md:text-[24px] font-bold text-on-surface leading-tight tracking-tight",
                isDone && "line-through text-outline",
                canEdit && "cursor-pointer hover:text-primary transition-colors"
              )}
            >
              {currentTask.title}
            </h1>
            {canEdit && (
              <SimpleTooltip content="Edit title">
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover/title:opacity-100 p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-low rounded-lg transition-all cursor-pointer shrink-0 mt-0.5"
                  aria-label="Edit title"
                >
                  <Pencil size={14} />
                </button>
              </SimpleTooltip>
            )}
          </div>
        )}

        {/* Labels row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {currentTask.labels?.map(label => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-[family-name:var(--font-body)] font-medium border border-black/5 dark:border-white/10 shadow-2xs"
              style={{ backgroundColor: `${label.color}22`, color: label.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
              <span>{label.name}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className="hover:opacity-70 transition-opacity ml-0.5"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-outline-variant text-outline hover:text-on-surface hover:border-primary/50 text-[11.5px] font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer">
                <Plus size={12} /><span>Label</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <div className="px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10.5px] font-semibold text-outline uppercase tracking-wider">Toggle Labels</div>
                {boardLabels.map(label => {
                  const isSelected = currentTask.labelIds?.includes(label.id);
                  return (
                    <DropdownMenuItem key={label.id} onClick={() => toggleLabel(label.id)} className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                        <span>{label.name}</span>
                      </div>
                      {isSelected && <Check size={14} className="text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ─── Property Sheet (Linear/Notion style Key-Value Grid) ─── */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/40 p-4 shadow-2xs w-full max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">

          {/* List */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10.5px] text-outline uppercase tracking-wider min-w-[80px]">
              <LayoutDashboard size={12} className="text-outline" /> List
            </span>
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/60 hover:bg-surface-high hover:border-outline-variant text-[12.5px] font-medium text-on-surface transition-all cursor-pointer shadow-2xs">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", getListColor(currentList?.name))} />
                  <span className="truncate max-w-[140px]">{currentList?.name ?? "List"}</span>
                  <ChevronDown size={11} className="text-outline shrink-0 ml-0.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-1 bg-surface rounded-xl border border-outline-variant/50 shadow-xl">
                  {taskLists.map(list => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() => handleTaskUpdate({ listId: list.id })}
                      className="flex items-center justify-between cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", getListColor(list.name))} />
                        <span className="truncate">{list.name}</span>
                      </div>
                      {currentTask.listId === list.id && <Check size={13} className="text-primary shrink-0 ml-1" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/40 text-[12.5px] font-medium text-on-surface">
                <span className={cn("w-2 h-2 rounded-full", getListColor(currentList?.name))} />
                <span>{currentList?.name ?? "Unknown"}</span>
              </span>
            )}
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10.5px] text-outline uppercase tracking-wider min-w-[80px]">
              <AlertTriangle size={12} className="text-outline" /> Priority
            </span>
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(
                  "inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[12px] font-semibold transition-all cursor-pointer shadow-2xs",
                  priorityConfig.bg, priorityConfig.color
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityConfig.dot)} />
                  <span>{priorityConfig.label}</span>
                  <ChevronDown size={11} className="opacity-70 ml-0.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 p-1 bg-surface rounded-xl border border-outline-variant/50 shadow-xl">
                  <DropdownMenuItem
                    disabled
                    className="flex items-center justify-between opacity-40 cursor-not-allowed px-2.5 py-1.5 rounded-lg text-[12px] select-none"
                  >
                    <div className="flex items-center gap-2 text-outline">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline/40" />
                      <span>None</span>
                    </div>
                    {!currentTask.priority && <Check size={13} className="text-primary" />}
                  </DropdownMenuItem>
                  <div className="h-px bg-outline-variant/20 my-1" />
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map(p => {
                    const cfg = PRIORITY_CONFIG[p];
                    return (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => handleTaskUpdate({ priority: p })}
                        className="flex items-center justify-between cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                          <span className={cn(cfg.color)}>{cfg.label}</span>
                        </div>
                        {currentTask.priority === p && <Check size={13} className="text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-semibold border", priorityConfig.bg, priorityConfig.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", priorityConfig.dot)} />
                <span>{priorityConfig.label}</span>
              </span>
            )}
          </div>

          {/* Assignee */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10.5px] text-outline uppercase tracking-wider min-w-[80px]">
              <UserIcon size={12} className="text-outline" /> Assignee
            </span>
            {(() => {
              const effectiveAssignee = currentTask.assignee || (
                currentTask.assigneeId
                  ? allUsers.find(u => u.id === currentTask.assigneeId || u.email === currentTask.assigneeId)
                  : undefined
              );

              return canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/60 hover:bg-surface-high hover:border-outline-variant text-[12.5px] font-medium text-on-surface transition-all cursor-pointer shadow-2xs max-w-[200px]">
                    {effectiveAssignee ? (
                      <>
                        <UserAvatar
                          userId={effectiveAssignee.id}
                          fullName={effectiveAssignee.fullName}
                          avatarUrl={effectiveAssignee.avatarUrl}
                          size={16}
                          rounded="full"
                          className="shrink-0"
                        />
                        <span className="truncate">{effectiveAssignee.fullName}</span>
                      </>
                    ) : (
                      <>
                        <UserIcon size={12} className="text-outline shrink-0" />
                        <span className="text-outline">Unassigned</span>
                      </>
                    )}
                    <ChevronDown size={11} className="text-outline shrink-0 ml-auto opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1.5 bg-surface rounded-xl border border-outline-variant/50 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    <DropdownMenuItem
                      onClick={() => handleTaskUpdate({ assigneeId: undefined })}
                      className="flex items-center justify-between cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px]"
                    >
                      <div className="flex items-center gap-2 text-outline">
                        <UserIcon size={13} />
                        <span>Unassigned</span>
                      </div>
                      {!currentTask.assigneeId && <Check size={13} className="text-primary" />}
                    </DropdownMenuItem>
                    <div className="h-px bg-outline-variant/20 my-1" />
                    {allUsers.map(u => {
                      const isSelected = currentTask.assigneeId === u.id;
                      return (
                        <DropdownMenuItem
                          key={u.id}
                          onClick={() => handleTaskUpdate({ assigneeId: u.id })}
                          className="flex items-center justify-between cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar
                              userId={u.id}
                              fullName={u.fullName}
                              avatarUrl={u.avatarUrl}
                              size={20}
                              rounded="full"
                              className="shrink-0 shadow-2xs"
                            />
                            <span className="truncate font-medium text-on-surface">{u.fullName}</span>
                          </div>
                          {isSelected && <Check size={13} className="text-primary ml-1 shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : effectiveAssignee ? (
                <div className="flex items-center gap-2">
                  <UserAvatar
                    userId={effectiveAssignee.id}
                    fullName={effectiveAssignee.fullName}
                    avatarUrl={effectiveAssignee.avatarUrl}
                    size={20}
                    rounded="full"
                    className="shrink-0"
                  />
                  <span className="font-[family-name:var(--font-body)] text-[12.5px] text-on-surface font-medium">
                    {effectiveAssignee.fullName}
                  </span>
                </div>
              ) : (
                <span className="font-[family-name:var(--font-body)] text-[12.5px] text-outline italic">
                  Unassigned
                </span>
              );
            })()}
          </div>

          {/* Due Date */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10.5px] text-outline uppercase tracking-wider min-w-[80px]">
              <Calendar size={12} className="text-outline" /> Due Date
            </span>
            <DatePicker
              value={currentTask.dueDate}
              onChange={newDate => handleTaskUpdate({ dueDate: newDate })}
              disabled={!canEdit}
              placeholder="No due date"
            />
          </div>

        </div>
      </div>

      {/* ─── Description Card (with Markdown Lite support & Live Preview) ─── */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/40 p-4.5 shadow-2xs flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-heading)] text-[14.5px] font-semibold text-on-surface flex items-center gap-2">
            <AlignLeft size={15} className="text-primary" />
            Description
          </h2>
          {canEdit && !isEditingDesc && (
            <button
              onClick={() => { setDescText(currentTask.description || ""); setIsEditingDesc(true); }}
              className="flex items-center gap-1 text-[11.5px] text-primary hover:underline cursor-pointer font-[family-name:var(--font-body)] font-medium"
            >
              <Pencil size={12} />
              <span>{currentTask.description ? "Edit" : "Add"}</span>
            </button>
          )}
        </div>

        {canEdit && isEditingDesc ? (
          <div className="pt-1">
            <RichComposer
              value={descText}
              onChange={setDescText}
              onSubmit={() => {
                if (descText.trim() !== (currentTask.description || "").trim()) {
                  setIsEditingDesc(false);
                  handleTaskUpdate({ description: descText.trim() });
                }
              }}
              onCancel={() => setIsEditingDesc(false)}
              mode="description"
              submitLabel="Save description"
              cancelLabel="Cancel"
              placeholder="Add a detailed description using Markdown Lite (*bold*, _italic_, `code`, - list)..."
              autoFocus
              isEditing={true}
              originalValue={currentTask.description || ""}
            />
          </div>
        ) : currentTask.description ? (
          <div className="font-[family-name:var(--font-body)] text-[13.5px] text-on-surface leading-relaxed p-1">
            <MessageRenderer text={currentTask.description} isOwn={false} maxExpandedHeight="max-h-[280px]" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (canEdit) {
                setDescText("");
                setIsEditingDesc(true);
              }
            }}
            disabled={!canEdit}
            className={cn(
              "text-left font-[family-name:var(--font-body)] text-[13px] text-outline italic py-3 px-3.5 bg-surface-low/30 rounded-xl border border-dashed border-outline-variant/40 transition-colors",
              canEdit && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            )}
          >
            {canEdit ? "+ Add a description using Markdown Lite (*bold*, _italic_, `code`, lists)..." : "No description provided."}
          </button>
        )}
      </div>

      {/* ─── Attachments Card ─── */}
      <div className="bg-surface-lowest rounded-2xl border border-outline-variant/40 p-4 shadow-2xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-[14.5px] font-semibold text-on-surface flex items-center gap-2">
            <Paperclip size={15} className="text-primary" />
            Attachments
            {attachmentsList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-surface-container font-[family-name:var(--font-mono)] text-[10px] text-on-surface-variant">
                {attachmentsList.length}
              </span>
            )}
          </h2>
        </div>

        {attachmentsList.length > 0 && (
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {attachmentsList.map(att => (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-between bg-surface-low rounded-xl px-3 py-2 border border-outline-variant/40 group hover:border-outline-variant transition-colors cursor-pointer"
                  onClick={() => downloadAttachment(att.id, att.fileName)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 shadow-2xs">
                      {getFileIcon(att.fileName, att.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface font-medium truncate leading-tight group-hover:text-primary transition-colors">
                        {att.fileName}
                      </p>
                      <p className="font-[family-name:var(--font-mono)] text-[10px] text-outline mt-0.5">
                        {formatFileSize(att.fileSize)} · {att.uploadedBy?.fullName ?? "Member"}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <SimpleTooltip content="Delete attachment">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setAttachmentToDelete({ id: att.id, name: att.fileName });
                        }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-error p-1.5 rounded-lg transition-all hover:bg-error-container/20 cursor-pointer active:scale-95"
                        aria-label="Delete attachment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </SimpleTooltip>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {canEdit && (
          <label
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 border-2 border-dashed border-outline-variant/60 hover:border-primary/50 hover:bg-surface-low/50 rounded-xl cursor-pointer transition-all group"
          >
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
            <div className="w-7 h-7 rounded-lg bg-surface-container group-hover:bg-primary/10 flex items-center justify-center text-outline group-hover:text-primary transition-colors">
              <Upload size={14} />
            </div>
            <div className="text-center">
              <span className="font-[family-name:var(--font-body)] text-[12.5px] font-medium text-primary">Click to upload</span>
              <span className="font-[family-name:var(--font-body)] text-[12.5px] text-outline"> or drop files</span>
            </div>
          </label>
        )}
      </div>

      {/* ─── Footer & Danger Zone ─── */}
      <div className="pt-2 flex flex-col gap-3">
        <div className="flex items-center justify-between font-[family-name:var(--font-mono)] text-[10px] text-outline px-1">
          <span>Created {formatDate(currentTask.createdAt)}</span>
          <span>Updated {formatRelative(currentTask.updatedAt)}</span>
        </div>

        {canEdit && (
          <div className="pt-2 border-t border-outline-variant/30 flex justify-end">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-error hover:bg-error-container/20 font-[family-name:var(--font-body)] text-[12px] font-medium transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete task</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Right column: premium thread ──────────────────────
  const groupedThread = (() => {
    type DateGroup = { label: string; items: typeof thread };
    const groups: DateGroup[] = [];
    let currentLabel = "";
    for (const item of thread) {
      const label = formatDateGroupLabel(item.createdAt);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  })();

  const threadPanelJSX = (
    <div className="flex flex-col h-full min-h-0">
      {/* Thread Subheader: Title, comment count badge, and sound mute/unmute toggle */}
      <div className="shrink-0 flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-outline-variant/30 bg-surface-low/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-[family-name:var(--font-heading)] text-[13px] font-semibold text-on-surface">
            Activity & Discussion
          </span>
          {commentsList.length > 0 && (
            <span className="font-[family-name:var(--font-mono)] text-[10.5px] px-2 py-0.2 rounded-full bg-surface-container text-on-surface-variant font-medium">
              {commentsList.length} comment{commentsList.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <SimpleTooltip content={soundEnabled ? "Mute chat sounds" : "Enable chat sounds (WhatsApp style)"}>
          <button
            type="button"
            onClick={toggleSound}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer text-[12px] flex items-center gap-1.5",
              soundEnabled
                ? "text-primary hover:bg-primary/10"
                : "text-outline hover:text-on-surface hover:bg-surface-high"
            )}
            aria-label={soundEnabled ? "Mute chat sounds" : "Enable chat sounds"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </SimpleTooltip>
      </div>

      {/* Scrollable thread body */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 md:px-5 py-4 md:py-5 flex flex-col gap-1">
        {/* Empty state */}
        {thread.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6"
          >
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shadow-sm">
                <MessageSquare size={28} className="text-primary" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-highest border-2 border-background flex items-center justify-center">
                <span className="text-[11px]">✦</span>
              </div>
            </div>
            <p className="font-[family-name:var(--font-heading)] text-[16px] font-semibold text-on-surface mb-1">No messages yet</p>
            <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant leading-relaxed max-w-[220px]">
              {canComment ? "Be the first to comment on this task." : "Activity will appear here as the task progresses."}
            </p>
          </motion.div>
        )}

        {/* Date-grouped thread */}
        {groupedThread.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {/* Date separator */}
            <div className="flex items-center gap-3 py-3 px-1">
              <div className="flex-1 h-px bg-outline-variant/30" />
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline uppercase tracking-widest shrink-0 px-1">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-outline-variant/30" />
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              {group.items.map((item, idx) => {
                // Activity pill
                if (item.kind === "activity") {
                  const summary = activitySummary(item.entry);
                  const colorClass = activityColor(item.entry.action);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.02 }}
                      className="flex items-center gap-2.5 py-1.5 px-3 rounded-xl hover:bg-surface-low/40 transition-colors group my-0.5"
                    >
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", colorClass)}>
                        <ActivityIcon action={item.entry.action} />
                      </div>
                      <p className="font-[family-name:var(--font-body)] text-[12.5px] text-on-surface-variant flex-1 leading-snug">
                        <span className="font-[family-name:var(--font-heading)] font-semibold text-on-surface text-[12.5px]">{summary.actor} </span>
                        <ActivityText text={summary.text} />
                      </p>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(item.createdAt)}
                      </span>
                    </motion.div>
                  );
                }

                // Chat comment bubble
                const comment = item.comment;
                const isMe = user?.id === comment.authorId || user?.id === comment.author?.id;
                const isEdited = Boolean(
                  comment.updatedAt &&
                  new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000
                );
                const isEditingThis = editingComment?.id === comment.id;
                const prevItem = group.items[idx - 1];
                const isContinuation =
                  prevItem &&
                  prevItem.kind === "comment" &&
                  (prevItem.comment.authorId === comment.authorId || prevItem.comment.author?.id === comment.author?.id) &&
                  new Date(comment.createdAt).getTime() - new Date(prevItem.comment.createdAt).getTime() < 300000;

                const initials = comment.author?.fullName
                  ? comment.author.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                  : "U";

                return (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex gap-2.5 group relative",
                      isMe ? "flex-row-reverse" : "flex-row",
                      isContinuation ? "mt-0.5" : "mt-2.5"
                    )}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setOpenMenuCommentId(comment.id);
                    }}
                  >
                    {/* Avatar column */}
                    <div className={cn(
                      "w-7 h-7 shrink-0 select-none",
                      isContinuation && "invisible"
                    )}>
                      <UserAvatar
                        userId={comment.author?.id || comment.authorId}
                        fullName={comment.author?.fullName}
                        avatarUrl={comment.author?.avatarUrl}
                        size={28}
                        rounded="xl"
                        className="ring-2 ring-background shadow-2xs"
                      />
                    </div>

                    {/* Bubble column */}
                    <div className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe ? "items-end" : "items-start")}>
                      {!isContinuation && (
                        <div className={cn("flex items-baseline gap-1.5 mb-1 px-1 select-none", isMe && "flex-row-reverse")}>
                          <span className="font-[family-name:var(--font-heading)] text-[12px] font-semibold text-on-surface">
                            {isMe ? "You" : comment.author?.fullName?.split(" ")[0] || "User"}
                          </span>
                          <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline">
                            {formatTime(comment.createdAt)}
                          </span>
                          {isEdited && (
                            <span className="font-[family-name:var(--font-body)] text-[10px] text-outline italic">
                              (edited)
                            </span>
                          )}
                        </div>
                      )}

                      {/* The bubble */}
                      <div className={cn(
                        "relative px-3.5 py-2.5 text-[13px] leading-relaxed shadow-2xs group/bubble transition-all cursor-pointer",
                        "font-[family-name:var(--font-body)]",
                        isEditingThis
                          ? "ring-2 ring-primary/50 border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                          : isMe
                          ? [
                              "bg-primary text-on-primary rounded-2xl",
                              isContinuation ? "rounded-tr-2xl" : "rounded-tr-sm",
                            ]
                          : [
                              "bg-surface-low border border-outline-variant/50 text-on-surface rounded-2xl",
                              isContinuation ? "rounded-tl-2xl" : "rounded-tl-sm",
                            ]
                      )}>
                        <div className="relative pr-4">
                          <MessageRenderer text={comment.content} isOwn={isMe} />

                          {/* Dropdown menu trigger */}
                          <div className="absolute -top-1.5 -right-2">
                            <DropdownMenu
                              open={openMenuCommentId === comment.id}
                              onOpenChange={(open) => setOpenMenuCommentId(open ? comment.id : null)}
                            >
                              <DropdownMenuTrigger
                                className={cn(
                                  "p-0.5 rounded-md text-outline hover:text-on-surface transition-all cursor-pointer",
                                  isMe ? "hover:bg-white/20 text-white/70" : "hover:bg-surface-high text-outline",
                                  "opacity-70 sm:opacity-0 sm:group-hover/bubble:opacity-100 focus:opacity-100",
                                  openMenuCommentId === comment.id && "opacity-100 bg-black/10 dark:bg-white/10"
                                )}
                                aria-label="Comment menu"
                              >
                                <ChevronDown size={12} />
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align={isMe ? "end" : "start"} className="w-42 p-1 bg-surface border-outline-variant/60 shadow-xl rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(comment.content);
                                    toast.success("Comment copied!");
                                  }}
                                  className="flex items-center gap-2 py-1.5 px-2.5 text-[12px] font-medium cursor-pointer rounded-lg text-on-surface hover:bg-surface-high"
                                >
                                  <Copy size={13} className="text-outline" />
                                  <span>Copy Text</span>
                                </DropdownMenuItem>

                                {isMe && (
                                  <DropdownMenuItem
                                    onClick={() => handleStartEdit(comment)}
                                    className="flex items-center gap-2 py-1.5 px-2.5 text-[12px] font-medium cursor-pointer rounded-lg text-on-surface hover:bg-surface-high"
                                  >
                                    <Pencil size={13} className="text-outline" />
                                    <span>Edit Comment</span>
                                  </DropdownMenuItem>
                                )}

                                {isMe && (
                                  <>
                                    <div className="my-1 h-px bg-outline-variant/30" />
                                    <DropdownMenuItem
                                      onClick={() => setCommentToDelete(comment)}
                                      className="flex items-center gap-2 py-1.5 px-2.5 text-[12px] font-medium cursor-pointer rounded-lg text-error hover:bg-error-container/20 focus:text-error"
                                    >
                                      <Trash2 size={13} />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}

        <div ref={threadEndRef} className="h-2" />
      </div>

      {/* Composer */}
      {canComment && (
        <div className="shrink-0 px-3 md:px-5 py-3 md:py-4 border-t border-outline-variant/40 bg-background/80 backdrop-blur-sm">
          {/* WhatsApp-style editing takeover banner */}
          <AnimatePresence>
            {editingComment && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-[12.5px] text-primary mb-2 select-none"
              >
                <div className="flex items-center gap-2 font-medium truncate">
                  <Pencil size={13} className="shrink-0 text-primary" />
                  <span>Editing comment</span>
                  <span className="text-outline font-[family-name:var(--font-mono)] text-[11px] truncate max-w-[240px] hidden sm:inline">
                    "{editingComment.content}"
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1 rounded-lg hover:bg-primary/20 text-primary transition-colors cursor-pointer shrink-0"
                  aria-label="Cancel editing"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2.5">
            <UserAvatar
              userId={user?.id}
              fullName={user?.fullName}
              avatarUrl={user?.avatarUrl}
              cacheBuster={user?.avatarUpdatedAt}
              size={32}
              rounded="full"
              className="shrink-0 mb-0.5 ring-2 ring-background shadow-xs"
            />
            <div className="flex-1">
              <RichComposer
                ref={composerRef}
                value={commentText}
                onChange={setCommentText}
                onSubmit={handleComment}
                onCancel={editingComment ? handleCancelEdit : undefined}
                isEditing={!!editingComment}
                originalValue={editingComment?.content}
                shortCode={currentTask.shortCode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Render Page Layout ─────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-background">

      {/* Page header — breadcrumb + shortCode + copy */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-outline-variant/30 bg-background gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/boards/${boardId}`}
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-low transition-colors shrink-0"
            aria-label="Back to board"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-1.5 text-outline font-[family-name:var(--font-mono)] text-[11px] min-w-0">
            <Link href="/boards" className="hover:text-primary transition-colors shrink-0">Boards</Link>
            <span>/</span>
            <Link href={`/boards/${boardId}`} className="hover:text-primary transition-colors truncate max-w-[120px] md:max-w-[200px]">{board.name}</Link>
            <span>/</span>
            <span className="text-on-surface shrink-0 font-semibold">{currentTask.shortCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Discussion Panel Toggle (Desktop) */}
          <SimpleTooltip content={isDiscussionOpen ? "Hide Discussion Panel (Focus Mode)" : "Show Discussion Panel"}>
            <button
              type="button"
              onClick={() => {
                setIsDiscussionOpen(prev => {
                  const next = !prev;
                  localStorage.setItem("taskflow-task-discussion-open", String(next));
                  return next;
                });
              }}
              className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl font-[family-name:var(--font-body)] text-[12.5px] font-medium transition-all cursor-pointer border shadow-2xs",
                isDiscussionOpen
                  ? "bg-primary/10 text-primary border-primary/25 hover:bg-primary/15"
                  : "bg-surface-low border-outline-variant/60 text-on-surface hover:bg-surface-high hover:border-outline-variant"
              )}
              aria-label={isDiscussionOpen ? "Hide Discussion Panel" : "Show Discussion Panel"}
            >
              <MessageSquare size={14} className={isDiscussionOpen ? "text-primary" : "text-outline"} />
              <span>Discussion</span>
              {thread.length > 0 && (
                <span className="font-[family-name:var(--font-mono)] text-[10px] px-1.5 py-0.2 rounded-md bg-surface-lowest border border-outline-variant/40 text-outline">
                  {thread.length}
                </span>
              )}
              {isDiscussionOpen ? (
                <PanelRightClose size={13} className="text-primary/70 ml-0.5" />
              ) : (
                <PanelRightOpen size={13} className="text-outline ml-0.5" />
              )}
            </button>
          </SimpleTooltip>

          <SimpleTooltip content="Copy Task ID">
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-low border border-outline-variant/60 text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors group shrink-0 cursor-pointer shadow-2xs"
              aria-label="Copy task ID"
            >
              <span className="font-[family-name:var(--font-mono)] text-[11.5px]">{currentTask.shortCode}</span>
              <Copy size={13} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden shrink-0 flex border-b border-outline-variant bg-surface-lowest">
        {(["details", "thread"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 font-[family-name:var(--font-body)] text-[13px] font-medium capitalize transition-colors cursor-pointer",
              activeTab === tab
                ? "text-primary border-b-2 border-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab === "details" ? "Details" : "Thread"}
            {tab === "thread" && thread.length > 0 && (
              <span className="ml-1.5 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{thread.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Mobile Layout: Single Column */}
      <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "details" && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {detailsPanelJSX}
          </div>
        )}
        {activeTab === "thread" && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {threadPanelJSX}
          </div>
        )}
      </div>

      {/* Desktop Layout: Collapsible Split / Focus Mode */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left: Task Details */}
        <div
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col bg-background/50 transition-all duration-200",
            isDiscussionOpen
              ? "w-[48%] xl:w-[45%] shrink-0 border-r border-outline-variant/40"
              : "w-full"
          )}
        >
          <div className={cn(isDiscussionOpen ? "w-full" : "max-w-3xl mx-auto w-full")}>
            {detailsPanelJSX}
          </div>
        </div>

        {/* Right: Thread & Comments (Collapsible Panel) */}
        <AnimatePresence initial={false}>
          {isDiscussionOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex-1 min-w-[340px] max-w-[54%] xl:max-w-[52%] flex flex-col min-h-0 overflow-hidden bg-surface-lowest/40"
            >
              {/* Thread header */}
              <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-outline-variant/30 bg-surface-lowest/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center shrink-0 shadow-2xs">
                    <MessageSquare size={15} className="text-primary" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-heading)] text-[14px] font-semibold text-on-surface truncate leading-tight">
                      {currentTask.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                      <p className="font-[family-name:var(--font-mono)] text-[10px] text-outline">
                        {commentsList.length} comment{commentsList.length !== 1 ? "s" : ""} · {activities.length} update{activities.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <SimpleTooltip content="Hide Discussion (Focus Mode)">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDiscussionOpen(false);
                      localStorage.setItem("taskflow-task-discussion-open", "false");
                    }}
                    className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
                    aria-label="Hide Discussion"
                  >
                    <PanelRightClose size={15} />
                  </button>
                </SimpleTooltip>
              </div>

              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {threadPanelJSX}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        description={`This permanently deletes '${currentTask.title}'. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      {/* Delete Attachment Confirmation */}
      <ConfirmDialog
        open={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={() => {
          if (attachmentToDelete) {
            handleDeleteAttachment(attachmentToDelete.id, attachmentToDelete.name);
            setAttachmentToDelete(null);
          }
        }}
        title="Delete Attachment"
        description={`Are you sure you want to delete '${attachmentToDelete?.name}'?`}
        confirmText="Delete"
        variant="destructive"
      />

      {/* Delete Comment Confirmation */}
      <ConfirmDialog
        open={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
