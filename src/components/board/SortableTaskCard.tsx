"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import TaskCard from "./TaskCard";
import type { Task, TaskList, BoardMember, Label } from "@/lib/types";

interface SortableTaskCardProps {
  task: Task;
  onClick: () => void;
  taskLists: TaskList[];
  currentListId: string;
  isDone?: boolean;
  members?: BoardMember[];
  allLabels?: Label[];
  disabled?: boolean;
}

export default function SortableTaskCard({
  task,
  onClick,
  taskLists,
  currentListId,
  isDone,
  members,
  allLabels,
  disabled = false,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: task.id,
    disabled,
    data: {
      type: "task",
      task,
      listId: task.listId,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // When being dragged, leave a clean dashed drop indicator in the list
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[78px] rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 dark:bg-primary/10 opacity-70 transition-all shrink-0"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      className={cn(
        disabled ? "" : "touch-none select-none transition-shadow",
        isOver && !isDragging ? "ring-2 ring-primary/60 rounded-xl" : ""
      )}
    >
      <TaskCard
        task={task}
        onClick={onClick}
        taskLists={taskLists}
        currentListId={currentListId}
        isDone={isDone}
        members={members}
        allLabels={allLabels}
      />
    </div>
  );
}
