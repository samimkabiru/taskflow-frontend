import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, MessageSquare, Paperclip, Trash2, MoreHorizontal, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskList, Priority, BoardMember, Label } from "@/lib/types";
import { hasPermission } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { moveTask, deleteTask } from "@/services/taskService";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SimpleTooltip } from "@/components/ui/tooltip";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  taskLists: TaskList[];
  currentListId: string;
  isDone?: boolean;
  members?: BoardMember[];
  allLabels?: Label[];
  onDelete?: (taskId: string) => void;
}

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string; dot: string }> = {
  LOW:    { color: "bg-secondary/20 text-secondary",   label: "Low",    dot: "bg-secondary" },
  MEDIUM: { color: "bg-tertiary/20 text-tertiary",     label: "Med",    dot: "bg-tertiary" },
  HIGH:   { color: "bg-error/15 text-error",           label: "High",   dot: "bg-error" },
  URGENT: { color: "bg-error/25 text-error font-bold", label: "Urgent", dot: "bg-error" },
};

const PRIORITY_STRIPE: Record<Priority, string> = {
  LOW:    "var(--color-secondary)",
  MEDIUM: "var(--tf-tertiary-fixed-dim, var(--color-tertiary))",
  HIGH:   "var(--color-error)",
  URGENT: "var(--color-error)",
};

export default function TaskCard({ task, onClick, taskLists, currentListId, isDone, members, allLabels, onDelete }: TaskCardProps) {
  const { getUserBoardRole } = useAuth();
  const role = getUserBoardRole(task.boardId);
  const canMove = role ? hasPermission(role, "MOVE_TASK") : false;
  const canDelete = role ? hasPermission(role, "DELETE_TASK") : false;

  // Resolve labels against live board labels if provided so color edits/deletions reflect immediately
  const displayLabels = useMemo(() => {
    if (!allLabels || allLabels.length === 0) return task.labels || [];
    const taskLabelIds = task.labelIds || task.labels?.map((l) => l.id) || [];
    return taskLabelIds
      .map((id) => allLabels.find((l) => l.id === id))
      .filter((l): l is Label => Boolean(l));
  }, [task.labels, task.labelIds, allLabels]);

  const effectiveAssignee = task.assignee || (
    task.assigneeId && members
      ? members.find(m => m.userId === task.assigneeId || m.user?.id === task.assigneeId || m.id === task.assigneeId)?.user
      : undefined
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const otherLists    = taskLists.filter(l => l.id !== currentListId);
  const isOverdue     = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
  const priorityCfg   = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const stripeColor   = task.priority ? PRIORITY_STRIPE[task.priority] : undefined;

  const isRecentUpdate = task.updatedAt && (Date.now() - new Date(task.updatedAt).getTime() < 5000);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (isRecentUpdate) {
      setHighlight(true);
      const t = setTimeout(() => setHighlight(false), 1800);
      return () => clearTimeout(t);
    }
  }, [task.updatedAt]);

  const formatDate = (dateStr: string) => {
    const d   = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1, y: 0,
        backgroundColor: highlight ? "rgba(110,100,224,0.12)" : "var(--color-surface-lowest)",
      }}
      exit={{ opacity: 0, y: 8 }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      whileTap={{ scale: 0.98 }}
      transition={{
        layout: { type: "spring", stiffness: 380, damping: 30 },
        opacity: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
        backgroundColor: { duration: 1.8 },
      }}
      className="relative flex flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-lowest shadow-xs hover:shadow-md hover:border-outline-variant cursor-pointer group shrink-0 transition-shadow"
      onClick={onClick}
    >
      {/* Priority left stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: isDone ? "var(--color-outline-variant)" : stripeColor }}
      />

      {/* Card body — compact */}
      <div className="pl-3 pr-2 pt-2.5 pb-2.5 flex flex-col gap-1.5">

        {/* Row 1: label dots + priority badge + options menu */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Label colour dots with custom sleek tooltips */}
            {displayLabels && displayLabels.length > 0 && (
              <div className="flex items-center gap-1 mr-1">
                {displayLabels.map(label => (
                  <SimpleTooltip key={label.id} content={label.name}>
                    <span
                      className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10 transition-transform hover:scale-125"
                      style={{ backgroundColor: label.color || "var(--color-primary)" }}
                    />
                  </SimpleTooltip>
                ))}
              </div>
            )}
            {/* Short code */}
            <span className={cn(
              "font-[family-name:var(--font-mono)] text-[10px] text-outline tracking-wide shrink-0",
              isDone && "line-through"
            )}>
              {task.shortCode}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Priority badge */}
            {!isDone && priorityCfg && (
              <span className={cn(
                "font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded-md shrink-0 leading-none",
                priorityCfg.color
              )}>
                {priorityCfg.label}
              </span>
            )}

            {/* Options menu (only if user has move or delete permissions) */}
            {(canMove || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 text-outline hover:text-on-surface hover:bg-surface-high/80 transition-all rounded-md cursor-pointer"
                  onClick={e => e.stopPropagation()}
                  aria-label={`Options for ${task.title}`}
                >
                  <MoreHorizontal size={14} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[150px]">
                  {canMove && otherLists.length > 0 && (
                    <div className="md:hidden">
                      <div className="px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10.5px] font-semibold text-outline uppercase tracking-wider">
                        Move to…
                      </div>
                      {otherLists.map(list => (
                        <DropdownMenuItem
                          key={list.id}
                          onClick={async e => {
                            e.stopPropagation();
                            try {
                              await moveTask({ taskId: task.id, taskListId: list.id, position: 0 });
                              toast.success(`Moved to ${list.name}`);
                            } catch {
                              toast.error(`Failed to move task to ${list.name}`);
                            }
                          }}
                        >
                          {list.name}
                        </DropdownMenuItem>
                      ))}
                      {canDelete && <DropdownMenuSeparator />}
                    </div>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    >
                      <Trash2 size={14} />
                      <span>Delete Task</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Row 2: Title */}
        <SimpleTooltip content={task.title} side="top">
          <p
            className={cn(
              "font-[family-name:var(--font-body)] text-[13.5px] font-medium text-on-surface leading-snug truncate",
              isDone && "line-through text-outline"
            )}
          >
            {task.title}
          </p>
        </SimpleTooltip>

        {/* Row 3: meta — due date + comment/attachment counts + assignee avatar */}
        {(task.dueDate || task.commentCount > 0 || task.attachmentCount > 0 || effectiveAssignee || task.assigneeId) && (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="flex items-center gap-2.5">
              {task.dueDate && (
                <span className={cn(
                  "flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px]",
                  isOverdue ? "text-error font-semibold" : "text-outline"
                )}>
                  <Calendar size={10} />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {task.commentCount > 0 && (
                <span className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] text-outline">
                  <MessageSquare size={10} />
                  {task.commentCount}
                </span>
              )}
              {task.attachmentCount > 0 && (
                <span className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] text-outline">
                  <Paperclip size={10} />
                  {task.attachmentCount}
                </span>
              )}
            </div>

            {/* Assignee avatar with custom tooltip or fallback placeholder */}
            {effectiveAssignee ? (
              <SimpleTooltip content={effectiveAssignee.fullName || "Assigned member"}>
                <UserAvatar
                  userId={effectiveAssignee.id}
                  fullName={effectiveAssignee.fullName}
                  avatarUrl={effectiveAssignee.avatarUrl}
                  size="xs"
                  rounded="full"
                />
              </SimpleTooltip>
            ) : task.assigneeId ? (
              <SimpleTooltip content="Assigned member">
                <div className="w-5 h-5 rounded-full overflow-hidden border border-outline-variant/60 bg-surface-variant flex items-center justify-center text-outline shrink-0">
                  <UserIcon size={10} />
                </div>
              </SimpleTooltip>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          onDelete?.(task.id);
          try {
            await deleteTask(task.id);
            toast.success(`Deleted "${task.title}"`);
          } catch {
            toast.error(`Failed to delete "${task.title}".`);
          }
        }}
        title="Delete Task"
        description={`This permanently deletes '${task.title}'. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </motion.div>
  );
}
