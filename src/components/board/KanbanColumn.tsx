"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MoreHorizontal, LayoutDashboard, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskList, BoardMember, Label } from "@/lib/types";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import QuickAddTask from "./QuickAddTask";
import SortableTaskCard from "./SortableTaskCard";

export const LIST_THEMES: Record<string, { bar: string; badge: string; dot: string; bg: string }> = {
  "Backlog":     { bar: "bg-slate-400/80 dark:bg-slate-500/80", dot: "bg-slate-400", badge: "bg-surface-container text-on-surface-variant", bg: "bg-surface-low/50 dark:bg-surface-lowest/50" },
  "To Do":       { bar: "bg-slate-400/80 dark:bg-slate-500/80", dot: "bg-slate-400", badge: "bg-surface-container text-on-surface-variant", bg: "bg-surface-low/50 dark:bg-surface-lowest/50" },
  "In Progress": { bar: "bg-primary",                           dot: "bg-primary",   badge: "bg-primary/10 text-primary font-semibold",      bg: "bg-primary/[0.02] dark:bg-primary/[0.03]" },
  "Review":      { bar: "bg-tertiary",                          dot: "bg-tertiary",  badge: "bg-tertiary/10 text-tertiary font-semibold",    bg: "bg-tertiary/[0.02] dark:bg-tertiary/[0.03]" },
  "In Review":   { bar: "bg-tertiary",                          dot: "bg-tertiary",  badge: "bg-tertiary/10 text-tertiary font-semibold",    bg: "bg-tertiary/[0.02] dark:bg-tertiary/[0.03]" },
  "Done":        { bar: "bg-secondary",                         dot: "bg-secondary", badge: "bg-secondary/15 text-secondary font-semibold",  bg: "bg-secondary/[0.02] dark:bg-secondary/[0.03]" },
};

export function getListTheme(name: string) {
  return LIST_THEMES[name] ?? {
    bar: "bg-primary/60",
    dot: "bg-primary/60",
    badge: "bg-surface-container text-on-surface-variant",
    bg: "bg-surface-low/40 dark:bg-surface-lowest/40",
  };
}

interface KanbanColumnProps {
  list: TaskList;
  tasks: Task[];
  allTaskLists: TaskList[];
  boardId: string;
  isLastList: boolean;
  canCreateTask: boolean;
  canEditList: boolean;
  addingToList: string | null;
  setAddingToList: (listId: string | null) => void;
  setListToRename: (item: { id: string; name: string } | null) => void;
  setListToDelete: (item: { id: string; name: string } | null) => void;
  onTaskClick: (taskId: string) => void;
  onTaskCreated?: (task: Task) => void;
  members: BoardMember[];
  labels: Label[];
  activeFilterCount: number;
  disabled?: boolean;
  onTaskDeleted?: (taskId: string) => void;
}

function ColumnBottomDropZone({ listId, disabled }: { listId: string; disabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-bottom-${listId}`,
    disabled,
    data: {
      type: "bottom-drop",
      listId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[44px] flex-1 rounded-xl transition-all duration-150 shrink-0",
        isOver
          ? "border-2 border-dashed border-primary/60 bg-primary/10 min-h-[56px]"
          : "border border-transparent"
      )}
    />
  );
}

export default function KanbanColumn({
  list,
  tasks,
  allTaskLists,
  boardId,
  isLastList,
  canCreateTask,
  canEditList,
  addingToList,
  setAddingToList,
  setListToRename,
  setListToDelete,
  onTaskClick,
  onTaskCreated,
  members,
  labels,
  activeFilterCount,
  disabled = false,
  onTaskDeleted,
}: KanbanColumnProps) {
  const listTheme = getListTheme(list.name);
  const taskIds = tasks.map((t) => t.id);

  const isPending = list.id.startsWith("temp-");

  // Column-level sortable
  const {
    attributes: colAttributes,
    listeners: colListeners,
    setNodeRef: setColRef,
    transform,
    transition,
    isDragging: isColDragging,
  } = useSortable({
    id: list.id,
    disabled: disabled || !canEditList || isPending,
    data: {
      type: "column",
      list,
    },
  });

  // Dedicated droppable node for when column has 0 tasks
  const { setNodeRef: setEmptyDropRef, isOver: isEmptyOver } = useDroppable({
    id: `droppable-empty-${list.id}`,
    disabled: disabled || tasks.length > 0 || isPending,
    data: {
      type: "empty-column",
      listId: list.id,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // If column itself is being dragged, show dashed placeholder
  if (isColDragging) {
    return (
      <div
        ref={setColRef}
        style={style}
        className="w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full min-h-[420px] rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 dark:bg-primary/10 opacity-60 snap-center md:snap-align-none"
      />
    );
  }

  const isColumnDragEnabled = !disabled && canEditList && !isPending;

  return (
    <motion.div
      ref={setColRef}
      id={`col-${list.id}`}
      style={style}
      exit={{
        opacity: 0,
        y: 12,
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
      }}
      className="w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full min-h-0 snap-center md:snap-align-none"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "w-full h-full min-h-0 flex flex-col rounded-2xl border shadow-xs relative overflow-hidden transition-colors border-outline-variant/40",
          listTheme.bg,
          isPending && "border-primary/50 shadow-md ring-1 ring-primary/25"
        )}
      >
        {/* Coloured top accent line (3px) */}
        <div className={cn("h-[3px] w-full shrink-0 transition-all", listTheme.bar, isPending && "animate-pulse")} />

        {/* Column Header (serves as drag handle for columns on desktop) */}
        <div
          {...(isColumnDragEnabled ? colAttributes : {})}
          {...(isColumnDragEnabled ? colListeners : {})}
          className={cn(
            "flex items-center justify-between px-3.5 py-3 shrink-0 border-b border-outline-variant/20 bg-surface/30 select-none",
            isColumnDragEnabled ? "cursor-grab active:cursor-grabbing" : ""
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isColumnDragEnabled && (
              <span className="hidden md:inline-flex text-outline/60 hover:text-outline shrink-0 -ml-1">
                <GripVertical size={13} />
              </span>
            )}
            <span className={cn("w-2 h-2 rounded-full shrink-0", listTheme.dot)} />
            <h3 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-on-surface truncate">
              {list.name}
            </h3>
            {isPending ? (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse font-[family-name:var(--font-mono)] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                Saving...
              </span>
            ) : (
              <span className={cn("px-2 py-0.5 rounded-full font-[family-name:var(--font-mono)] text-[10px]", listTheme.badge)}>
                {tasks.length}
              </span>
            )}
          </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header Quick Add Button */}
          {canCreateTask && !isLastList && !isPending && (
            <SimpleTooltip content={`Add task to ${list.name}`}>
              <button
                type="button"
                onClick={() => setAddingToList(addingToList === list.id ? null : list.id)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer text-on-surface-variant hover:text-primary hover:bg-surface-container",
                  addingToList === list.id && "bg-primary/10 text-primary"
                )}
                aria-label={`Add task to ${list.name}`}
              >
                <Plus size={16} />
              </button>
            </SimpleTooltip>
          )}

          {canEditList && !isPending && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container cursor-pointer"
                aria-label={`Options for ${list.name}`}
              >
                <MoreHorizontal size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => setListToRename({ id: list.id, name: list.name })}
                >
                  Rename List
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setListToDelete({ id: list.id, name: list.name })}
                >
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Quick Add at top of column when triggered */}
      {canCreateTask && addingToList === list.id && (
        <div className="p-2.5 shrink-0 border-b border-outline-variant/30 bg-surface/50">
          <QuickAddTask
            listId={list.id}
            listName={list.name}
            boardId={boardId}
            onCancel={() => setAddingToList(null)}
            onAdded={(createdTask) => {
              if (createdTask && onTaskCreated) {
                onTaskCreated(createdTask);
              }
              setAddingToList(null);
              toast.success("Task created!");
            }}
          />
        </div>
      )}

      {/* Task Cards Scrollable Area */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar p-2.5 transition-colors",
          isLastList ? "opacity-80 hover:opacity-100 transition-opacity" : ""
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && addingToList !== list.id ? (
            <div
              ref={isPending ? undefined : setEmptyDropRef}
              className={cn(
                "flex flex-col items-center justify-center py-8 px-3 text-center rounded-xl border border-dashed transition-all my-auto",
                isPending
                  ? "border-primary/40 bg-surface-low/30 shadow-2xs"
                  : isEmptyOver
                  ? "border-primary bg-primary/10"
                  : "border-outline-variant/40 bg-surface-low/20"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center mb-1.5 text-outline">
                {isPending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : (
                  <LayoutDashboard size={14} />
                )}
              </div>
              <p className="font-[family-name:var(--font-body)] text-[12.5px] text-on-surface-variant mb-0.5 font-medium transition-colors">
                {isPending ? "Creating list..." : isEmptyOver ? "Drop task here" : "No tasks yet"}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[11px] text-outline mb-2 transition-colors">
                {isPending
                  ? "Connecting to workspace"
                  : activeFilterCount > 0
                  ? "Try adjusting your filters"
                  : isLastList
                  ? "Drop completed tasks here"
                  : "Drop tasks here or create one"}
              </p>
              {canCreateTask && !isLastList && !isEmptyOver && (
                <div className="h-6 flex items-center justify-center">
                  {isPending ? (
                    <span className="text-[11px] text-outline/50 font-mono tracking-tight animate-pulse">
                      synchronizing...
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingToList(list.id)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      <Plus size={13} /> Add task
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence>
                {tasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                    taskLists={allTaskLists}
                    currentListId={list.id}
                    isDone={isLastList}
                    members={members}
                    allLabels={labels}
                    disabled={disabled || isPending}
                    onTaskDeleted={onTaskDeleted}
                  />
                ))}
              </AnimatePresence>
              <ColumnBottomDropZone listId={list.id} disabled={disabled || isPending} />
            </>
          )}
        </SortableContext>
      </div>
      </motion.div>
    </motion.div>
  );
}
