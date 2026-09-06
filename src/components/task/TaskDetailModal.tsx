"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Calendar, Paperclip, Send, History, Upload, Trash2, AlertTriangle, Pencil, Check, Plus, User, Tags } from "lucide-react";
import type { Task, Priority, Comment } from "@/lib/types";
import { getCommentsForTask, createComment, updateComment, deleteComment } from "@/services/commentService";
import CommentItem from "@/components/task/CommentItem";
import MessageRenderer from "@/components/chat/MessageRenderer";
import { getAttachmentsForTask, uploadAttachment, deleteAttachment } from "@/services/attachmentService";
import { getTaskListsForBoard, updateTask, moveTask, deleteTask } from "@/services/taskService";
import { getLabelsForBoard, assignLabelsToTask } from "@/services/labelService";
import { getBoardMembers } from "@/services/boardService";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SimpleTooltip } from "@/components/ui/tooltip";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskDetailModalProps {
  task: Task;
  boardId: string;
  onClose: () => void;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW: { label: "Low", color: "text-on-secondary-container", bg: "bg-secondary-container" },
  MEDIUM: { label: "Medium", color: "text-on-tertiary-container", bg: "bg-tertiary-fixed" },
  HIGH: { label: "High Priority", color: "text-on-error-container", bg: "bg-error-container" },
  URGENT: { label: "Urgent", color: "text-on-error", bg: "bg-error" },
};

const NO_PRIORITY_CONFIG = {
  label: "None",
  color: "text-on-surface-variant",
  bg: "bg-surface-low",
};

export default function TaskDetailModal({ task, boardId, onClose }: TaskDetailModalProps) {
  const { getUserBoardRole, user } = useAuth();
  const role = getUserBoardRole(boardId);
  const canEdit = role ? hasPermission(role, "EDIT_TASK") : false;
  const canComment = role ? hasPermission(role, "COMMENT") : false;

  const [currentTask, setCurrentTask] = useState<Task>(task);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descText, setDescText] = useState(task.description || "");

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [boardLabels, setBoardLabels] = useState<any[]>([]);
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const currentList = taskLists.find(l => l.id === currentTask.listId);

  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [commentText, setCommentText] = useState("");
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [attachmentsList, setAttachmentsList] = useState<any[]>([]);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);

  useEffect(() => {
    if (boardId) {
      getBoardMembers(boardId).then(m => setAllUsers(m.map(x => x.user))).catch(() => {});
      getLabelsForBoard(boardId).then(setBoardLabels).catch(() => {});
      getTaskListsForBoard(boardId).then(setTaskLists).catch(() => {});
      getCommentsForTask(task.id).then(setCommentsList).catch(() => {});
      getAttachmentsForTask(task.id).then(setAttachmentsList).catch(() => {});
    }
  }, [boardId, task.id]);

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment);
    setCommentText(comment.content);
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.style.height = "auto";
        commentInputRef.current.style.height = `${Math.min(commentInputRef.current.scrollHeight, 120)}px`;
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setCommentText("");
    if (commentInputRef.current) {
      commentInputRef.current.style.height = "auto";
    }
  };

  const isCommentDirty = editingComment
    ? commentText.trim() !== editingComment.content.trim() && commentText.trim().length > 0
    : commentText.trim().length > 0;

  const handleCreateOrUpdateComment = async () => {
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
        setCommentsList(prev => [...prev, created]);
        setCommentText("");
        if (commentInputRef.current) {
          commentInputRef.current.style.height = "auto";
        }
        toast.success("Comment posted");
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

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    const hasStatusChange = updates.listId !== undefined && updates.listId !== currentTask.listId;

    try {
      let updatedTask: Task = currentTask;

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

      setCurrentTask(prev => ({
        ...prev,
        ...updatedTask,
        listId: updates.listId ?? prev.listId,
        assignee,
        labels,
      }));
      if (updates.description !== undefined) {
        setDescText(updates.description);
      }
      toast.success(hasStatusChange ? "Task moved" : "Task updated");
    } catch {
      toast.error(hasStatusChange ? "Failed to move task" : "Failed to update task");
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentTask.shortCode);
    toast.success("Task ID copied!");
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    toast.success("Comment posted!");
    setCommentText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const att = await uploadAttachment(currentTask.id, file);
        setAttachmentsList(prev => (prev.some(a => a.id === att.id) ? prev : [...prev, att]));
      }
      toast.success(`${files.length === 1 ? files[0].name : `${files.length} files`} uploaded`);
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const att = await uploadAttachment(currentTask.id, file);
        setAttachmentsList(prev => (prev.some(a => a.id === att.id) ? prev : [...prev, att]));
      }
      toast.success(`${files.length === 1 ? files[0].name : `${files.length} files`} uploaded`);
    } catch {
      toast.error("Failed to upload attachment");
    }
  };

  const handleDeleteAttachment = async (id: string, name: string) => {
    try {
      await deleteAttachment(id);
      setAttachmentsList(prev => prev.filter(a => a.id !== id));
      toast.success(`Deleted ${name}`);
    } catch {
      toast.error(`Failed to delete ${name}`);
    }
  };

  const priorityConfig = (currentTask.priority && PRIORITY_CONFIG[currentTask.priority])
    ? PRIORITY_CONFIG[currentTask.priority]
    : NO_PRIORITY_CONFIG;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelative = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const toggleLabel = async (labelId: string) => {
    const currentIds = currentTask.labelIds || [];
    const isRemoving = currentIds.includes(labelId);
    const newIds = isRemoving
      ? currentIds.filter(id => id !== labelId)
      : [...currentIds, labelId];

    try {
      await assignLabelsToTask(currentTask.id, newIds);
      const newLabels = boardLabels.filter(l => newIds.includes(l.id));
      setCurrentTask(prev => ({ ...prev, labelIds: newIds, labels: newLabels }));
      toast.success(isRemoving ? "Label removed" : "Label added");
    } catch {
      toast.error(isRemoving ? "Failed to remove label" : "Failed to add label");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 md:p-8 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-lowest w-full max-w-[580px] rounded-xl shadow-[var(--tf-shadow-2)] flex flex-col max-h-[90vh] border border-outline-variant relative overflow-hidden animate-scale-in">
        {/* Left accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container" />

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3.5 border-b border-outline-variant shrink-0 pl-7">
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors group"
            aria-label="Copy task ID"
          >
            <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-wider">
              {currentTask.shortCode}
            </span>
            <Copy size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="flex items-center gap-1">
            {canEdit && (
              <SimpleTooltip content="Delete task">
                <button
                  onClick={() => setShowTaskDeleteConfirm(true)}
                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-full transition-colors cursor-pointer"
                  aria-label="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </SimpleTooltip>
            )}
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-full p-1.5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pl-7 flex flex-col gap-7">
          {/* Title & Chips */}
          <div className="flex flex-col gap-3">
            {canEdit && isEditingTitle ? (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onKeyDown={(e) => {
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
                  className="w-full font-[family-name:var(--font-heading)] text-[20px] font-semibold text-on-surface bg-surface-low border border-primary rounded-lg px-3 py-1 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setTitleText(currentTask.title);
                  }}
                  className="p-1.5 bg-surface-low hover:bg-surface-high text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer shrink-0 border border-outline-variant/40"
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
                  className="p-1.5 bg-primary text-on-primary rounded-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
                  aria-label="Save title"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 group/title">
                <h2
                  onClick={() => canEdit && setIsEditingTitle(true)}
                  className={cn(
                    "font-[family-name:var(--font-heading)] text-[22px] font-semibold text-on-surface leading-snug",
                    canEdit && "cursor-pointer hover:text-primary transition-colors"
                  )}
                >
                  {currentTask.title}
                </h2>
                {canEdit && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover/title:opacity-100 p-1 text-on-surface-variant hover:text-primary rounded transition-all cursor-pointer shrink-0"
                    aria-label="Edit title"
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
            )}

            {/* Labels and Priority Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {currentTask.labels?.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-[family-name:var(--font-mono)] text-[11px] border border-black/5 dark:border-white/10 shadow-2xs"
                  style={{
                    backgroundColor: `${label.color}22`,
                    color: label.color,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                  <span>{label.name}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className="hover:opacity-70 transition-opacity ml-0.5 cursor-pointer"
                      aria-label={`Remove label ${label.name}`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              ))}

              {/* Label Toggle Menu if canEdit */}
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary text-[11px] font-[family-name:var(--font-mono)] transition-colors cursor-pointer">
                    <Plus size={12} />
                    <span>Labels</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="elevation-2 rounded-lg border-outline-variant min-w-[160px]">
                    <div className="px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10.5px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Add / Remove Labels
                    </div>
                    {boardLabels.map((label) => {
                      const isSelected = currentTask.labelIds?.includes(label.id);
                      return (
                        <DropdownMenuItem
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className="flex items-center justify-between cursor-pointer px-2.5 py-1.5 text-[12px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                            <span>{label.name}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-[family-name:var(--font-mono)] text-[11px]",
                priorityConfig.bg, priorityConfig.color
              )}>
                {currentTask.priority === "HIGH" || currentTask.priority === "URGENT" ? (
                  <AlertTriangle size={12} />
                ) : null}
                {priorityConfig.label}
              </span>
            </div>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-4 bg-surface-low rounded-lg p-4 border border-outline-variant/50">
            {/* Assignee */}
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant uppercase tracking-wider">
                Assignee
              </span>
              {(() => {
                const effectiveAssignee = currentTask.assignee || (
                  currentTask.assigneeId
                    ? allUsers.find(u => u.id === currentTask.assigneeId || u.email === currentTask.assigneeId)
                    : undefined
                );

                return canEdit ? (
                  <Select
                    value={currentTask.assigneeId || "unassigned"}
                    onValueChange={(val) => { if (val == null) return; handleTaskUpdate({ assigneeId: val === "unassigned" ? undefined : val }); }}
                  >
                    <SelectTrigger className="w-full h-8 text-[12px] bg-surface-lowest border-outline-variant text-on-surface">
                      <SelectValue placeholder="Unassigned">
                        {effectiveAssignee ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              userId={effectiveAssignee.id}
                              fullName={effectiveAssignee.fullName}
                              avatarUrl={effectiveAssignee.avatarUrl}
                              size={16}
                              rounded="full"
                              className="shrink-0"
                            />
                            <span className="truncate">{effectiveAssignee.fullName}</span>
                          </div>
                        ) : (
                          "Unassigned"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : effectiveAssignee ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      userId={effectiveAssignee.id}
                      fullName={effectiveAssignee.fullName}
                      avatarUrl={effectiveAssignee.avatarUrl}
                      size={24}
                      rounded="full"
                      className="shrink-0"
                    />
                    <span className="font-[family-name:var(--font-body)] text-[13px] text-on-surface font-medium">
                      {effectiveAssignee.fullName}
                    </span>
                  </div>
                ) : (
                  <span className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant">
                    Unassigned
                  </span>
                );
              })()}
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant uppercase tracking-wider">
                Due Date
              </span>
              {canEdit ? (
                <input
                  type="date"
                  value={currentTask.dueDate || ""}
                  onChange={(e) => handleTaskUpdate({ dueDate: e.target.value || undefined })}
                  className="bg-surface-lowest border border-outline-variant rounded-md px-2 py-1 font-[family-name:var(--font-body)] text-[12px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                />
              ) : (
                <div className="flex items-center gap-1.5 text-on-surface font-[family-name:var(--font-body)] text-[13px] font-medium">
                  <Calendar size={15} className="text-on-surface-variant" />
                  {currentTask.dueDate ? formatDate(currentTask.dueDate) : "No due date"}
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant uppercase tracking-wider">
                List
              </span>
              {canEdit ? (
                <Select
                  value={currentTask.listId}
                  onValueChange={(val) => { if (val == null) return; handleTaskUpdate({ listId: val }); }}
                >
                  <SelectTrigger className="w-full h-8 text-[12px] bg-surface-lowest border-outline-variant text-on-surface">
                    <SelectValue placeholder="List" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-[family-name:var(--font-body)] text-[13px] text-on-surface font-medium">
                  {currentList?.name ?? "Unknown"}
                </span>
              )}
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1">
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant uppercase tracking-wider">
                Priority
              </span>
              {canEdit ? (
                <Select
                  value={currentTask.priority || "NONE"}
                  onValueChange={(val) => {
                    if (val == null) return;
                    handleTaskUpdate({ priority: val === "NONE" ? null : (val as Priority) });
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-[12px] bg-surface-lowest border-outline-variant text-on-surface">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" disabled className="opacity-40 cursor-not-allowed">None</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-[family-name:var(--font-body)] text-[13px] text-on-surface font-medium capitalize">
                  {currentTask.priority ? currentTask.priority.toLowerCase() : "None"}
                </span>
              )}
            </div>
          </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="font-[family-name:var(--font-heading)] text-[16px] font-medium text-on-surface">
                  Description
                </h3>
                {canEdit && !isEditingDesc && (
                  <button
                    type="button"
                    onClick={() => {
                      setDescText(currentTask.description || "");
                      setIsEditingDesc(true);
                    }}
                    className="flex items-center gap-1 text-[12px] text-primary hover:underline cursor-pointer font-[family-name:var(--font-body)] font-medium"
                  >
                    <Pencil size={12} />
                    <span>{currentTask.description ? "Edit" : "Add description"}</span>
                  </button>
                )}
              </div>

              {canEdit && isEditingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                    placeholder="Add a detailed description..."
                    rows={4}
                    className="w-full bg-surface-low border border-primary rounded-lg p-3 font-[family-name:var(--font-body)] text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none resize-y"
                    autoFocus
                  />
                  <div className="flex justify-end items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDesc(false)}
                      className="px-3 py-1.5 rounded-lg bg-surface-low text-on-surface text-[12px] font-medium hover:bg-surface-high transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={descText.trim() === (currentTask.description || "").trim()}
                      onClick={() => {
                        if (descText.trim() !== (currentTask.description || "").trim()) {
                          setIsEditingDesc(false);
                          handleTaskUpdate({ description: descText.trim() });
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[12px] font-medium hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
                    >
                      Save Description
                    </button>
                  </div>
                </div>
              ) : currentTask.description ? (
                <div className="font-[family-name:var(--font-body)] text-[13.5px] text-on-surface leading-relaxed p-1">
                  <MessageRenderer text={currentTask.description} maxExpandedHeight="max-h-[220px]" />
                </div>
              ) : (
                canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDescText("");
                      setIsEditingDesc(true);
                    }}
                    className="w-full text-left font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant/70 italic py-2.5 px-3 bg-surface-low/30 rounded-xl border border-dashed border-outline-variant/50 hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    + Add a description...
                  </button>
                ) : (
                  <div className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant/60 italic py-2 px-1">
                    No description provided.
                  </div>
                )
              )}
            </div>

          {/* Attachments */}
          <div className="flex flex-col gap-3">
            <h3 className="font-[family-name:var(--font-heading)] text-[16px] font-medium text-on-surface flex items-center gap-2">
              <Paperclip size={16} />
              Attachments ({attachmentsList.length})
            </h3>

            {/* List of Attachments */}
            {attachmentsList.length > 0 && (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {attachmentsList.map((att) => (
                    <motion.div
                      key={att.id}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex items-center justify-between bg-surface-low rounded-lg px-3 py-2.5 border border-outline-variant/50 group shrink-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center shrink-0">
                          <Paperclip size={14} className="text-on-surface-variant" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface font-medium truncate">
                            {att.fileName}
                          </p>
                          <p className="font-[family-name:var(--font-mono)] text-[10px] text-on-surface-variant">
                            {formatFileSize(att.fileSize)} • {att.uploadedBy?.fullName || "User"}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => setAttachmentToDelete({ id: att.id, name: att.fileName })}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-error p-1 rounded transition-all hover:bg-error-container/30 cursor-pointer active:scale-95"
                          aria-label={`Delete ${att.fileName}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Upload Drop Zone */}
            {canEdit && (
              <label
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center gap-2 py-4 px-4 border-2 border-dashed border-outline-variant hover:border-primary/50 hover:bg-surface-low/50 rounded-xl cursor-pointer transition-all group active:scale-[0.99]"
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-8 h-8 rounded-full bg-surface-container group-hover:bg-primary-container/20 flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                  <Upload size={16} />
                </div>
                <div className="text-center">
                  <span className="font-[family-name:var(--font-body)] text-[13px] font-medium text-primary hover:underline">
                    Click to upload
                  </span>
                  <span className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant">
                    {" "}or drag and drop files
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Divider */}
          <hr className="border-outline-variant" />

          {/* Activity & Comments */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <h3 className="font-[family-name:var(--font-heading)] text-[16px] font-medium text-on-surface">
                Activity
              </h3>
              <span className="flex-1 border-t border-outline-variant/50" />
            </div>


            {/* Comments */}
            <AnimatePresence mode="popLayout">
              {commentsList.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUser={user ?? undefined}
                  isEditing={editingComment?.id === comment.id}
                  onStartEdit={handleStartEdit}
                  onDelete={(c) => setCommentToDelete(c)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Comment Input Footer */}
        {canComment && (
          <div className="p-3.5 sm:p-4 px-5 sm:px-6 border-t border-outline-variant bg-surface-container shrink-0 flex flex-col gap-1.5 select-none">
            {/* WhatsApp-style editing takeover banner */}
            <AnimatePresence>
              {editingComment && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 4 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[12px] text-primary"
                >
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <Pencil size={12} className="shrink-0 text-primary" />
                    <span>Editing comment</span>
                    <span className="text-outline font-[family-name:var(--font-mono)] text-[10.5px] truncate max-w-[200px] hidden sm:inline">
                      "{editingComment.content}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-0.5 rounded-md hover:bg-primary/20 text-primary transition-colors cursor-pointer shrink-0"
                    aria-label="Cancel editing"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-3">
              <UserAvatar
                userId={user?.id}
                fullName={user?.fullName}
                avatarUrl={user?.avatarUrl}
                cacheBuster={user?.avatarUpdatedAt}
                rounded="xl"
                className="w-7 h-7 shrink-0 mb-0.5 shadow-2xs"
              />
              <div className={cn(
                "flex-1 relative bg-surface-lowest rounded-xl border transition-all shadow-2xs",
                editingComment
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-outline-variant/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
              )}>
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={editingComment ? "Edit your comment... (Esc to cancel)" : "Add a comment... (Enter to send, Shift+Enter for new line)"}
                  rows={1}
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none font-[family-name:var(--font-body)] text-[13px] text-on-surface py-2.5 pl-3 pr-10 min-h-[40px] max-h-[120px] leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isCommentDirty) {
                        handleCreateOrUpdateComment();
                      }
                    } else if (e.key === "Escape" && editingComment) {
                      handleCancelEdit();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "";
                    target.style.height = target.scrollHeight + "px";
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateOrUpdateComment}
                  disabled={!isCommentDirty}
                  className={cn(
                    "absolute right-2 bottom-1.5 p-1.5 rounded-lg transition-all cursor-pointer disabled:pointer-events-none",
                    editingComment
                      ? isCommentDirty
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                        : "bg-surface-container text-outline opacity-40"
                      : isCommentDirty
                      ? "text-on-surface-variant hover:text-primary"
                      : "text-outline opacity-30"
                  )}
                  aria-label={editingComment ? "Save edited comment" : "Send comment"}
                >
                  {editingComment ? <Check size={15} strokeWidth={2.5} /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={() => {
          if (attachmentToDelete) {
            handleDeleteAttachment(attachmentToDelete.id, attachmentToDelete.name);
          }
        }}
        title="Delete Attachment"
        description={`This permanently deletes '${attachmentToDelete?.name}'. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={showTaskDeleteConfirm}
        onClose={() => setShowTaskDeleteConfirm(false)}
        onConfirm={async () => {
          await deleteTask(currentTask.id);
          toast.success(`Deleted "${currentTask.title}"`);
          onClose();
        }}
        title="Delete Task"
        description={`This permanently deletes '${currentTask.title}'. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
