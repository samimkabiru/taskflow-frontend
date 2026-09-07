"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  UserPlus, ChevronRight, MoreHorizontal, Plus, History, Tags,
  Filter, X, Calendar, User, Users, LayoutDashboard, ArrowLeft, LogOut, Search,
} from "lucide-react";
import { getBoard, getBoardMembers, leaveBoard } from "@/services/boardService";
import {
  getTaskListsForBoard,
  getTasksForBoard,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  reorderTaskList,
  moveTask,
} from "@/services/taskService";
import { getLabelsForBoard } from "@/services/labelService";
import { useAuth } from "@/contexts/AuthContext";
import { useBoardWebSocket } from "@/hooks/useBoardWebSocket";
import { hasPermission } from "@/lib/types";
import TaskCard from "@/components/board/TaskCard";
import QuickAddTask from "@/components/board/QuickAddTask";
import KanbanColumn from "@/components/board/KanbanColumn";
import ManageLabelsModal from "@/components/board/ManageLabelsModal";
import InviteMemberModal from "@/components/board/InviteMemberModal";
import BoardMembersModal from "@/components/board/BoardMembersModal";
import UserAvatar from "@/components/ui/UserAvatar";
import BoardFilterBar, { type DueDateFilter } from "@/components/board/BoardFilterBar";
import NotFoundState from "@/components/ui/NotFoundState";
import BoardKanbanSkeleton from "@/components/board/BoardKanbanSkeleton";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { triggerNavigationStart } from "@/components/layout/NavigationProgressBar";
import type { Task, TaskList, Label, BoardMember, Board, Priority } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { calculateNewPosition } from "@/lib/dndPosition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import InputDialog from "@/components/ui/InputDialog";

const LIST_THEMES: Record<string, { bar: string; badge: string; dot: string; bg: string }> = {
  "Backlog":     { bar: "bg-slate-400/80 dark:bg-slate-500/80", dot: "bg-slate-400", badge: "bg-surface-container text-on-surface-variant", bg: "bg-surface-low/50 dark:bg-surface-lowest/50" },
  "To Do":       { bar: "bg-slate-400/80 dark:bg-slate-500/80", dot: "bg-slate-400", badge: "bg-surface-container text-on-surface-variant", bg: "bg-surface-low/50 dark:bg-surface-lowest/50" },
  "In Progress": { bar: "bg-primary",                           dot: "bg-primary",   badge: "bg-primary/10 text-primary font-semibold",      bg: "bg-primary/[0.02] dark:bg-primary/[0.03]" },
  "Review":      { bar: "bg-tertiary",                          dot: "bg-tertiary",  badge: "bg-tertiary/10 text-tertiary font-semibold",    bg: "bg-tertiary/[0.02] dark:bg-tertiary/[0.03]" },
  "In Review":   { bar: "bg-tertiary",                          dot: "bg-tertiary",  badge: "bg-tertiary/10 text-tertiary font-semibold",    bg: "bg-tertiary/[0.02] dark:bg-tertiary/[0.03]" },
  "Done":        { bar: "bg-secondary",                         dot: "bg-secondary", badge: "bg-secondary/15 text-secondary font-semibold",  bg: "bg-secondary/[0.02] dark:bg-secondary/[0.03]" },
};

function getListTheme(name: string) {
  return LIST_THEMES[name] ?? {
    bar: "bg-primary/60",
    dot: "bg-primary/60",
    badge: "bg-surface-container text-on-surface-variant",
    bg: "bg-surface-low/40 dark:bg-surface-lowest/40"
  };
}

export default function BoardKanbanPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const { user, getUserBoardRole, setUserBoardRole } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag and Drop States
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskList | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const previousTasksRef = useRef<Task[]>([]);
  const previousListsRef = useRef<TaskList[]>([]);

  // Load board data asynchronously
  useEffect(() => {
    let isMounted = true;
    async function loadBoardData() {
      setLoading(true);
      try {
        const [b, lists, boardTasks, lbls, mbrs] = await Promise.all([
          getBoard(boardId),
          getTaskListsForBoard(boardId),
          getTasksForBoard(boardId),
          getLabelsForBoard(boardId),
          getBoardMembers(boardId),
        ]);
        if (isMounted) {
          setBoard(b);
          setTaskLists(lists);
          setTasks(boardTasks);
          setLabels(lbls);
          setMembers(mbrs);

          // Update current user role in auth context
          const isOwner = user && (b.ownerId === user.id || b.ownerId === user.email);
          const myMembership = mbrs.find(m => m.userId === user?.id || m.user?.email === user?.email);
          if (isOwner) {
            setUserBoardRole(boardId, "OWNER");
          } else if (myMembership) {
            setUserBoardRole(boardId, myMembership.role);
          }
        }
      } catch {
        if (isMounted) setBoard(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (boardId) {
      loadBoardData();
    }

    return () => {
      isMounted = false;
    };
  }, [boardId, user?.id, user?.email, setUserBoardRole]);

  // Connect STOMP WebSocket for real-time live synchronization (§6)
  useBoardWebSocket(boardId, {
    onTaskCreated: (newTask) => {
      setTasks((prev) => (prev.some((t) => t.id === newTask.id) ? prev : [...prev, newTask]));
    },
    onTaskUpdated: (updatedTask) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    },
    onTaskDeleted: (taskId) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    },
    onTaskMoved: (movedTask) => {
      setTasks((prev) => prev.map((t) => (t.id === movedTask.id ? movedTask : t)));
    },
    onTaskLabelsChanged: (taskId, newLabels) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, labelIds: newLabels.map((l) => l.id), labels: newLabels }
            : t
        )
      );
    },
    onListCreated: (newList) => {
      setTaskLists((prev) => {
        if (prev.some((l) => l.id === newList.id)) return prev;
        const tempIdx = prev.findIndex(
          (l) => (l.id.startsWith("temp-") || l.clientKey) && l.name.toLowerCase() === newList.name.toLowerCase()
        );
        if (tempIdx !== -1) {
          const updated = [...prev];
          updated[tempIdx] = { ...newList, clientKey: prev[tempIdx].clientKey };
          return updated;
        }
        return [...prev, newList];
      });
    },
    onListRenamed: (renamedList) => {
      setTaskLists((prev) => prev.map((l) => (l.id === renamedList.id ? renamedList : l)));
    },
    onListDeleted: (listId) => {
      setTaskLists((prev) => prev.filter((l) => l.id !== listId));
      setTasks((prev) => prev.filter((t) => t.listId !== listId));
    },
    onListReordered: (reorderedList) => {
      setTaskLists((prev) =>
        prev
          .map((l) => (l.id === reorderedList.id ? reorderedList : l))
          .sort((a, b) => a.position - b.position)
      );
    },
    onLabelCreated: (newLabel) => {
      setLabels((prev) => (prev.some((l) => l.id === newLabel.id) ? prev : [...prev, newLabel]));
    },
    onLabelUpdated: (updatedLabel) => {
      setLabels((prev) => prev.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)));
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          labels: t.labels?.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)),
        }))
      );
    },
    onLabelDeleted: (labelId) => {
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          labelIds: t.labelIds?.filter((id) => id !== labelId),
          labels: t.labels?.filter((l) => l.id !== labelId),
        }))
      );
    },
    onMemberAdded: (newMember) => {
      setMembers((prev) => (prev.some((m) => m.id === newMember.id) ? prev : [...prev, newMember]));
    },
    onMemberRoleChanged: (updatedMember) => {
      setMembers((prev) => prev.map((m) => (m.userId === updatedMember.userId ? updatedMember : m)));
    },
    onMemberRemoved: (userId) => {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    },
    onBoardUpdated: (boardDto) => {
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              name: boardDto.name,
              description: boardDto.description || "",
              accentColor: boardDto.accentColor,
            }
          : prev
      );
    },
    onCommentAdded: (newComment) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newComment.taskId
            ? { ...t, commentCount: (t.commentCount || 0) + 1 }
            : t
        )
      );
    },
    onCommentDeleted: (_commentId, taskId) => {
      if (taskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, commentCount: Math.max(0, (t.commentCount || 0) - 1) }
              : t
          )
        );
      }
    },
    onAttachmentAdded: (newAtt) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newAtt.taskId
            ? { ...t, attachmentCount: (t.attachmentCount || 0) + 1 }
            : t
        )
      );
    },
    onAttachmentRemoved: (_attId, taskId) => {
      if (taskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, attachmentCount: Math.max(0, (t.attachmentCount || 0) - 1) }
              : t
          )
        );
      }
    },
  });

  const isOwner = (user && board && (board.ownerId === user.id || board.ownerId === user.email)) || getUserBoardRole(boardId) === "OWNER";
  const role = isOwner ? "OWNER" : (getUserBoardRole(boardId) ?? "MEMBER");

  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // List Dialog States
  const [listToDelete, setListToDelete] = useState<{ id: string; name: string } | null>(null);
  const [listToRename, setListToRename] = useState<{ id: string; name: string } | null>(null);
  const [showAddListModal, setShowAddListModal] = useState(false);

  // Deduplicate taskLists defensively by ID and sort by position ascending
  const uniqueTaskLists = useMemo(() => {
    const seen = new Set<string>();
    return taskLists
      .filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      })
      .sort((a, b) => a.position - b.position);
  }, [taskLists]);

  // Task filters
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<Priority[]>([]);
  const [filterDueDate, setFilterDueDate] = useState<DueDateFilter>("ALL");
  const [activeMobileColumnId, setActiveMobileColumnId] = useState<string | null>(null);

  const isScrollingProgrammatically = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToColumn = (listId: string) => {
    isScrollingProgrammatically.current = true;
    setActiveMobileColumnId(listId);

    const element = document.getElementById(`col-${listId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    const pillElement = document.getElementById(`pill-${listId}`);
    if (pillElement) {
      pillElement.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 500);
  };

  // Synchronize manual horizontal swipe scrolling on mobile with the active column pill using continuous centroid calculation
  useEffect(() => {
    const container = document.getElementById("kanban-board-container");
    if (!container || taskLists.length === 0) return;

    let ticking = false;

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const containerRect = container.getBoundingClientRect();
          const containerCenter = containerRect.left + containerRect.width / 2;

          let closestListId: string | null = null;
          let minDistance = Infinity;

          taskLists.forEach((list) => {
            const colElement = document.getElementById(`col-${list.id}`);
            if (colElement) {
              const colRect = colElement.getBoundingClientRect();
              const colCenter = colRect.left + colRect.width / 2;
              const distance = Math.abs(colCenter - containerCenter);

              if (distance < minDistance) {
                minDistance = distance;
                closestListId = list.id;
              }
            }
          });

          // Check if Add List column is closest or if scrolled near the end
          const addListElement = document.getElementById("col-add-list");
          if (addListElement) {
            const addListRect = addListElement.getBoundingClientRect();
            const addListCenter = addListRect.left + addListRect.width / 2;
            const distance = Math.abs(addListCenter - containerCenter);

            if (distance < minDistance) {
              minDistance = distance;
              closestListId = "add-list";
            }
          }

          if (closestListId) {
            setActiveMobileColumnId((prev) => {
              if (prev !== closestListId) {
                const pillElement = document.getElementById(`pill-${closestListId}`);
                if (pillElement) {
                  pillElement.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }
                return closestListId;
              }
              return prev;
            });
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [taskLists]);

  const canCreateTask = role ? hasPermission(role, "CREATE_TASK") : false;
  const canEditList = role ? hasPermission(role, "EDIT_LIST") : false;
  const canCreateList = role ? hasPermission(role, "CREATE_LIST") : false;
  const canManageMembers = role ? hasPermission(role, "MANAGE_MEMBERS") : false;
  const canManageLabels = role ? hasPermission(role, "EDIT_LABEL") : false;
  const canMoveTask = role ? hasPermission(role, "MOVE_TASK") : false;
  const canReorderList = role ? hasPermission(role, "EDIT_LIST") : false;

  // Desktop detection for Drag-and-Drop activation (>=768px)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Configure Sensors (Pointer with 5px distance constraint to avoid hijacking card clicks + Keyboard for accessibility)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection strategy: prioritizes pointer within bounds to avoid jumping across columns
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // 1. Column Dragging: only consider column sortables
      if (activeColumn || args.active.data.current?.type === "column") {
        return closestCorners({
          ...args,
          droppableContainers: args.droppableContainers.filter((container) =>
            uniqueTaskLists.some((l) => l.id === container.id)
          ),
        });
      }

      // 2. Task Dragging: Filter droppableContainers to only task cards & drop zones (exclude column sortables)
      const taskDroppableContainers = args.droppableContainers.filter((container) => {
        const id = String(container.id);
        const type = container.data.current?.type;
        return type === "task" || id.startsWith("droppable-");
      });

      const taskArgs = {
        ...args,
        droppableContainers: taskDroppableContainers,
      };

      // Check pointer collisions among task droppables
      const pointerCollisions = pointerWithin(taskArgs);
      if (pointerCollisions.length > 0) {
        // Prioritize task card over bottom/empty drop zones if pointer is inside a card
        const taskCollision = pointerCollisions.find((c) => {
          const container = taskDroppableContainers.find((dc) => dc.id === c.id);
          return container?.data.current?.type === "task";
        });
        if (taskCollision) {
          return [taskCollision];
        }
        return pointerCollisions;
      }

      // Fallback for fast drags: closestCenter among task droppables
      return closestCenter(taskArgs);
    },
    [activeColumn, uniqueTaskLists]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    previousTasksRef.current = tasks;
    previousListsRef.current = taskLists;

    if (activeData?.type === "column") {
      const col = uniqueTaskLists.find((l) => l.id === active.id);
      if (col) setActiveColumn(col);
    } else if (activeData?.type === "task") {
      const t = tasks.find((item) => item.id === active.id);
      if (t) setActiveTask(t);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Intentionally no state mutation during drag motion.
    // Preserving task state stability during drag prevents cross-column layout reflows and infinite re-render loops.
    // Target resolution, position calculation, and atomic state updates execute cleanly in handleDragEnd.
  };

  const handleDragCancel = () => {
    if (previousTasksRef.current.length > 0) {
      setTasks(previousTasksRef.current);
      previousTasksRef.current = [];
    }
    if (previousListsRef.current.length > 0) {
      setTaskLists(previousListsRef.current);
      previousListsRef.current = [];
    }
    setActiveTask(null);
    setActiveColumn(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const currentActiveTask = activeTask;
    const currentActiveColumn = activeColumn;

    setActiveTask(null);
    setActiveColumn(null);

    const originalTasks = previousTasksRef.current.length > 0 ? previousTasksRef.current : tasks;
    const originalLists = previousListsRef.current.length > 0 ? previousListsRef.current : taskLists;
    previousTasksRef.current = [];
    previousListsRef.current = [];

    if (!over) {
      setTasks(originalTasks);
      setTaskLists(originalLists);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // 1. Column Reordering
    if (active.data.current?.type === "column" || currentActiveColumn) {
      const colId = currentActiveColumn?.id || activeId;
      if (colId === overId) {
        return;
      }

      if (!canReorderList) {
        toast.error("You do not have permission to reorder lists.");
        setTaskLists(originalLists);
        return;
      }

      const sortedLists = [...originalLists].sort((a, b) => a.position - b.position);
      const oldIndex = sortedLists.findIndex((l) => l.id === colId);
      const newIndex = sortedLists.findIndex((l) => l.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return;
      }

      const reordered = arrayMove(sortedLists, oldIndex, newIndex);
      const otherLists = reordered.filter((l) => l.id !== colId);
      const newPosition = calculateNewPosition(otherLists, newIndex);

      setTaskLists((prev) =>
        prev
          .map((l) => (l.id === colId ? { ...l, position: newPosition } : l))
          .sort((a, b) => a.position - b.position)
      );

      try {
        await reorderTaskList(colId, newPosition);
      } catch {
        setTaskLists(originalLists);
        toast.error("Failed to reorder list. Changes reverted.");
      }
      return;
    }

    // 2. Task Movement / Reordering
    if (active.data.current?.type === "task" || currentActiveTask) {
      const taskId = currentActiveTask?.id || activeId;
      const originalTask = originalTasks.find((t) => t.id === taskId);
      if (!originalTask) {
        setTasks(originalTasks);
        return;
      }

      if (!canMoveTask) {
        toast.error("You do not have permission to move tasks.");
        setTasks(originalTasks);
        return;
      }

      const sourceListId = originalTask.listId;

      // Determine target list ID
      let targetListId: string | null = null;

      if (over.data.current?.listId) {
        targetListId = over.data.current.listId;
      } else if (overId.startsWith("droppable-bottom-")) {
        targetListId = overId.replace("droppable-bottom-", "");
      } else if (overId.startsWith("droppable-empty-")) {
        targetListId = overId.replace("droppable-empty-", "");
      } else if (overId.startsWith("droppable-")) {
        targetListId = overId.replace("droppable-", "");
      } else if (uniqueTaskLists.some((l) => l.id === overId)) {
        targetListId = overId;
      } else {
        const overTask = originalTasks.find((t) => t.id === overId) || tasks.find((t) => t.id === overId);
        if (overTask) {
          targetListId = overTask.listId;
        }
      }

      if (!targetListId) {
        setTasks(originalTasks);
        return;
      }

      let newPosition: number;

      // ============================================
      // A. REORDERING WITHIN THE SAME LIST
      // ============================================
      if (sourceListId === targetListId) {
        // If dropped onto self -> Clean NO-OP
        if (taskId === overId) {
          setTasks(originalTasks);
          return;
        }

        // Current tasks in source column, strictly sorted by position ascending
        const columnTasks = originalTasks
          .filter((t) => t.listId === sourceListId)
          .sort((a, b) => a.position - b.position);

        const oldIndex = columnTasks.findIndex((t) => t.id === taskId);
        let newIndex = -1;

        if (overId.startsWith("droppable-bottom-")) {
          newIndex = columnTasks.length - 1;
        } else {
          newIndex = columnTasks.findIndex((t) => t.id === overId);
        }

        // Dropped back in place or invalid indices -> Clean NO-OP
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          setTasks(originalTasks);
          return;
        }

        // Reorder using standard arrayMove (same proven pattern as column reordering)
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const otherTasks = reordered.filter((t) => t.id !== taskId);
        newPosition = calculateNewPosition(otherTasks, newIndex);
      } else {
        // ============================================
        // B. MOVING TO A DIFFERENT LIST
        // ============================================
        const targetColumnTasks = originalTasks
          .filter((t) => t.listId === targetListId && t.id !== taskId)
          .sort((a, b) => a.position - b.position);

        let targetIndex: number;

        if (
          overId.startsWith("droppable-empty-") ||
          (overId.startsWith("droppable-") && targetColumnTasks.length === 0) ||
          overId === targetListId
        ) {
          // Empty list -> top / position 1000
          targetIndex = 0;
        } else if (overId.startsWith("droppable-bottom-")) {
          // Explicit bottom drop zone -> end of list
          targetIndex = targetColumnTasks.length;
        } else {
          // Dropped over an existing card in target list
          const overIndex = targetColumnTasks.findIndex((t) => t.id === overId);

          if (overIndex === -1) {
            targetIndex = targetColumnTasks.length;
          } else {
            // Check pointer / card midpoint: above midpoint -> overIndex; below midpoint -> overIndex + 1
            const isBelow = Boolean(
              active.rect.current.translated &&
              over.rect &&
              active.rect.current.translated.top + active.rect.current.translated.height / 2 >
                over.rect.top + over.rect.height / 2
            );

            targetIndex = isBelow ? overIndex + 1 : overIndex;
          }
        }

        newPosition = calculateNewPosition(targetColumnTasks, targetIndex);
      }

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, listId: targetListId!, position: newPosition }
            : t
        )
      );

      try {
        await moveTask({
          taskId,
          taskListId: targetListId,
          position: newPosition,
        });
      } catch {
        setTasks(originalTasks);
        toast.error("Failed to move task. Changes reverted.");
      }
    }
  };

  const activeFilterCount =
    (filterKeyword.trim() ? 1 : 0) +
    filterAssignees.length +
    filterLabels.length +
    filterPriorities.length +
    (filterDueDate !== "ALL" ? 1 : 0);

  const clearFilters = () => {
    setFilterKeyword("");
    setFilterAssignees([]);
    setFilterLabels([]);
    setFilterPriorities([]);
    setFilterDueDate("ALL");
  };

  const toggleAssigneeFilter = (id: string) => {
    setFilterAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleLabelFilter = (id: string) => {
    setFilterLabels((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const togglePriorityFilter = (p: Priority) => {
    setFilterPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const filterTasks = (tasks: Task[]): Task[] => {
    return tasks.filter((task) => {
      // Keyword search (title, shortCode, description)
      if (filterKeyword.trim()) {
        const q = filterKeyword.trim().toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesCode = task.shortCode?.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesDesc) return false;
      }

      // Assignee filter
      if (filterAssignees.length > 0) {
        const matchesUnassigned = filterAssignees.includes("UNASSIGNED") && !task.assigneeId;
        const matchesSpecificUser = task.assigneeId ? filterAssignees.includes(task.assigneeId) : false;
        if (!matchesUnassigned && !matchesSpecificUser) return false;
      }

      // Label filter
      if (filterLabels.length > 0 && !filterLabels.some((l) => task.labelIds.includes(l))) {
        return false;
      }

      // Priority filter
      if (filterPriorities.length > 0 && (!task.priority || !filterPriorities.includes(task.priority))) {
        return false;
      }

      // Due date filter
      if (filterDueDate !== "ALL") {
        const now = new Date();
        if (filterDueDate === "NO_DUE_DATE") {
          if (task.dueDate) return false;
        } else if (filterDueDate === "OVERDUE") {
          if (!task.dueDate || new Date(task.dueDate) >= now) return false;
        } else if (filterDueDate === "THIS_WEEK") {
          if (!task.dueDate) return false;
          const due = new Date(task.dueDate);
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (due < now || due > weekEnd) return false;
        }
      }
      return true;
    });
  };

  // Loading skeleton state (prevents premature "board not found" flash)
  if (loading) {
    return <BoardKanbanSkeleton />;
  }

  // Board not found state (only shown if loading is complete and no board was found)
  if (!board) {
    return (
      <NotFoundState
        type="board"
        title="Board Not Found"
        description="The board you're looking for doesn't exist, may have been deleted, or your account lacks viewing permissions."
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
      {/* Board Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-4 shrink-0 gap-4 bg-background border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-1.5 text-outline mb-1">
            <Link href="/boards" className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider hover:text-primary transition-colors">
              Boards
            </Link>
            <ChevronRight size={14} />
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface">
              {board.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: board.accentColor || "var(--color-primary)" }}
            />
            <h1 className="font-[family-name:var(--font-heading)] text-[24px] md:text-[28px] font-bold text-on-background tracking-tight">
              {board.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 font-[family-name:var(--font-body)] text-[13px] font-medium rounded-xl transition-all border cursor-pointer",
              activeFilterCount > 0
                ? "bg-primary-container text-on-primary-container border-primary/30 shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-low border-outline-variant/60"
            )}
          >
            <Filter size={15} />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary text-on-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Member Avatars (Clickable to view all board members) */}
          <SimpleTooltip content={`View all ${members.length} board members`}>
            <button
              type="button"
              onClick={() => setShowMembersModal(true)}
              className="flex -space-x-2 p-1 -m-1 rounded-full hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer group"
              aria-label={`View all ${members.length} board members`}
            >
              {members.slice(0, 3).map((m) => (
                <UserAvatar
                  key={m.id}
                  userId={m.user.id || m.userId}
                  fullName={m.user.fullName}
                  avatarUrl={m.user.avatarUrl}
                  size={32}
                  rounded="full"
                  className="border-2 border-background shadow-xs group-hover:scale-105 transition-transform"
                />
              ))}
              {members.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-background bg-surface-highest group-hover:bg-primary-container group-hover:text-on-primary-container flex items-center justify-center font-[family-name:var(--font-mono)] text-[10px] text-on-surface-variant transition-colors shadow-xs">
                  +{members.length - 3}
                </div>
              )}
            </button>
          </SimpleTooltip>

          {/* Options Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-low rounded-xl transition-colors border border-outline-variant/60 cursor-pointer focus:outline-none" aria-label="Board options">
              <MoreHorizontal size={17} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowMembersModal(true)}>
                <Users size={15} />
                <span>Members</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.push(`/boards/${boardId}/activity`)}>
                <History size={15} />
                <span>Activity</span>
              </DropdownMenuItem>

              {canManageLabels && (
                <DropdownMenuItem onClick={() => setShowLabelsModal(true)}>
                  <Tags size={15} />
                  <span>Labels</span>
                </DropdownMenuItem>
              )}

              {canManageMembers && (
                <DropdownMenuItem onClick={() => setShowInviteModal(true)}>
                  <UserPlus size={15} />
                  <span>Invite</span>
                </DropdownMenuItem>
              )}

              {!isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setShowLeaveConfirm(true)}>
                    <LogOut size={15} />
                    <span>Leave Board</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modern Filter Bar (collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden shrink-0"
          >
            <BoardFilterBar
              searchQuery={filterKeyword}
              onSearchChange={setFilterKeyword}
              selectedAssignees={filterAssignees}
              onToggleAssignee={toggleAssigneeFilter}
              onClearAssignees={() => setFilterAssignees([])}
              selectedLabels={filterLabels}
              onToggleLabel={toggleLabelFilter}
              onClearLabels={() => setFilterLabels([])}
              selectedPriorities={filterPriorities}
              onTogglePriority={togglePriorityFilter}
              onClearPriorities={() => setFilterPriorities([])}
              selectedDueDate={filterDueDate}
              onDueDateChange={setFilterDueDate}
              allUsers={members.map(m => m.user)}
              allLabels={labels}
              onClearAll={clearFilters}
              activeFilterCount={activeFilterCount}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Column Segmented Pill Switcher (md:hidden) */}
      <div className="md:hidden shrink-0 px-3 py-2 bg-surface-low/80 border-b border-outline-variant/30 overflow-x-auto custom-scrollbar flex items-center gap-1.5 z-10 select-none">
        <AnimatePresence>
          {uniqueTaskLists.map((list) => {
            const rawTasks = tasks.filter(t => t.listId === list.id);
            const listTasks = filterTasks(rawTasks);
            const listTheme = getListTheme(list.name);
            const isActive = (activeMobileColumnId ?? uniqueTaskLists[0]?.id) === list.id;
            const isPending = list.id.startsWith("temp-");

            return (
              <motion.button
                key={list.clientKey || list.id}
                id={`pill-${list.id}`}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  width: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                  borderWidth: 0,
                  transition: {
                    opacity: { duration: 0.12, ease: "linear" },
                    width: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                    paddingLeft: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                    paddingRight: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                transition={{
                  layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => scrollToColumn(list.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-[family-name:var(--font-body)] shrink-0 cursor-pointer shadow-2xs active:scale-95 overflow-hidden whitespace-nowrap",
                  isActive
                    ? "bg-surface text-primary border border-primary/50 shadow-xs font-semibold ring-1 ring-primary/20"
                    : "bg-surface-lowest/70 text-on-surface-variant hover:text-on-surface border border-outline-variant/30 hover:bg-surface font-medium",
                  isPending && "border-primary/40 text-primary"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", listTheme.dot)} />
                <span className="truncate">{list.name}</span>
                {isPending ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                ) : (
                  <span className={cn("px-1.5 py-0.2 rounded-full font-[family-name:var(--font-mono)] text-[9.5px]", listTheme.badge)}>
                    {listTasks.length}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>

        {canCreateList && (
          <motion.button
            layout
            transition={{
              layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
            }}
            id="pill-add-list"
            type="button"
            onClick={() => scrollToColumn("add-list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-[family-name:var(--font-body)] shrink-0 cursor-pointer shadow-2xs active:scale-95 border border-dashed border-primary/40 text-primary hover:bg-primary/10 whitespace-nowrap",
              activeMobileColumnId === "add-list"
                ? "bg-primary/15 font-semibold ring-1 ring-primary/30"
                : "bg-surface-lowest/70 font-medium"
            )}
          >
            <Plus size={13} />
            <span>Add list</span>
          </motion.button>
        )}
      </div>

      {/* Kanban Board Drag-and-Drop Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          id="kanban-board-container"
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden kanban-scroll px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-3 md:py-4 flex gap-3 md:gap-4 items-stretch snap-x snap-mandatory md:snap-none"
        >
          <SortableContext
            items={uniqueTaskLists.map((l) => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            <AnimatePresence>
              {uniqueTaskLists.map((list) => {
                const rawTasks = tasks
                  .filter((t) => t.listId === list.id)
                  .sort((a, b) => a.position - b.position);
                const columnTasks = filterTasks(rawTasks);
                const isLastList = list.name === "Done";

                return (
                  <KanbanColumn
                    key={list.clientKey || list.id}
                    list={list}
                    tasks={columnTasks}
                    allTaskLists={uniqueTaskLists}
                    boardId={boardId}
                    isLastList={isLastList}
                    canCreateTask={canCreateTask}
                    canEditList={canEditList}
                    addingToList={addingToList}
                    setAddingToList={setAddingToList}
                    setListToRename={setListToRename}
                    setListToDelete={setListToDelete}
                    onTaskClick={(taskId) => {
                      triggerNavigationStart();
                      router.push(`/boards/${boardId}/tasks/${taskId}`);
                    }}
                    onTaskCreated={(newTask) => {
                      setTasks((prev) => (prev.some((t) => t.id === newTask.id) ? prev : [...prev, newTask]));
                    }}
                    onTaskDeleted={(taskId) => {
                      setTasks((prev) => prev.filter((t) => t.id !== taskId));
                    }}
                    members={members}
                    labels={labels}
                    activeFilterCount={activeFilterCount}
                    disabled={!isDesktop || !canMoveTask}
                  />
                );
              })}
            </AnimatePresence>
          </SortableContext>

          {/* Add List Column / Snap Target */}
          {canCreateList && (
            <div
              id="col-add-list"
              className="w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 snap-center md:snap-align-none flex flex-col justify-start"
            >
              <button
                type="button"
                onClick={() => setShowAddListModal(true)}
                className="w-full py-8 md:py-12 flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-outline-variant/60 hover:border-primary/60 rounded-2xl bg-surface-low/30 hover:bg-surface-low/80 text-on-surface-variant hover:text-primary transition-all font-[family-name:var(--font-body)] cursor-pointer group shadow-2xs"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Plus size={20} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-on-surface group-hover:text-primary transition-colors">
                    Create new list
                  </p>
                  <p className="text-[11.5px] text-outline mt-0.5">
                    Add another column to this board
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Scroll spacer */}
          <div className="w-4 shrink-0" />
        </div>

        {/* Drag Overlay (Lifted card/column preview during drag) */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-1 scale-[1.02] rounded-xl overflow-hidden shadow-2xl cursor-grabbing pointer-events-none opacity-95">
              <TaskCard
                task={activeTask}
                onClick={() => {}}
                taskLists={taskLists}
                currentListId={activeTask.listId}
                isDone={uniqueTaskLists.find((l) => l.id === activeTask.listId)?.name === "Done"}
                members={members}
                allLabels={labels}
              />
            </div>
          ) : activeColumn ? (
            <div className="rotate-1 scale-[1.01] rounded-2xl overflow-hidden shadow-2xl opacity-90 cursor-grabbing pointer-events-none w-[85vw] sm:w-[300px] md:w-[320px]">
              <KanbanColumn
                list={activeColumn}
                tasks={tasks
                  .filter((t) => t.listId === activeColumn.id)
                  .sort((a, b) => a.position - b.position)}
                allTaskLists={uniqueTaskLists}
                boardId={boardId}
                isLastList={activeColumn.name === "Done"}
                canCreateTask={false}
                canEditList={false}
                addingToList={null}
                setAddingToList={() => {}}
                setListToRename={() => {}}
                setListToDelete={() => {}}
                onTaskClick={() => {}}
                members={members}
                labels={labels}
                activeFilterCount={0}
                disabled={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Board Members Modal */}
      {showMembersModal && (
        <BoardMembersModal
          boardId={boardId}
          open={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          onOpenInvite={() => {
            setShowMembersModal(false);
            setShowInviteModal(true);
          }}
        />
      )}

      {/* Manage Labels Modal */}
      {showLabelsModal && (
        <ManageLabelsModal
          boardId={boardId}
          labels={labels}
          onClose={() => setShowLabelsModal(false)}
          onLabelCreated={(newLabel) => {
            setLabels((prev) => (prev.some((l) => l.id === newLabel.id) ? prev : [...prev, newLabel]));
          }}
          onLabelUpdated={(updatedLabel) => {
            setLabels((prev) => prev.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)));
            setTasks((prev) =>
              prev.map((t) => ({
                ...t,
                labels: t.labels?.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)),
              }))
            );
          }}
          onLabelDeleted={(labelId) => {
            setLabels((prev) => prev.filter((l) => l.id !== labelId));
            setTasks((prev) =>
              prev.map((t) => ({
                ...t,
                labelIds: t.labelIds?.filter((id) => id !== labelId),
                labels: t.labels?.filter((l) => l.id !== labelId),
              }))
            );
          }}
        />
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          boardId={boardId}
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Leave Board Confirmation */}
      <ConfirmDialog
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={async () => {
          if (board) {
            try {
              await leaveBoard(board.id);
              toast.success(`You have left '${board.name}'`);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("boards-updated"));
              }
              router.push("/boards");
            } catch {
              toast.error("Failed to leave board");
            }
          }
        }}
        title="Leave Board"
        description={`You'll lose access to this board and need to be re-invited to rejoin. Are you sure you want to leave '${board?.name}'?`}
        confirmText="Leave Board"
        variant="destructive"
      />

      {/* Delete List Confirmation */}
      <ConfirmDialog
        open={!!listToDelete}
        onClose={() => setListToDelete(null)}
        onConfirm={async () => {
          if (listToDelete) {
            const target = listToDelete;
            const prevLists = [...taskLists];
            const prevTasks = [...tasks];

            // 1. If deleted list is currently active on mobile, find neighbor and re-anchor smoothly
            const targetIndex = uniqueTaskLists.findIndex((l) => l.id === target.id);
            const remainingLists = uniqueTaskLists.filter((l) => l.id !== target.id);
            if (activeMobileColumnId === target.id || !activeMobileColumnId) {
              const newActiveList =
                remainingLists[Math.max(0, targetIndex - 1)] ||
                remainingLists[0] ||
                null;
              if (newActiveList) {
                setActiveMobileColumnId(newActiveList.id);
                scrollToColumn(newActiveList.id);
              }
            }

            // 2. Immediately trigger optimistic deletion with fade-out
            setTaskLists(prev => prev.filter(l => l.id !== target.id));
            setTasks(prev => prev.filter(t => t.listId !== target.id));

            // 3. Perform API call in background
            try {
              await deleteTaskList(target.id);
              toast.success(`List "${target.name}" deleted.`);
            } catch {
              // Revert on failure
              setTaskLists(prevLists);
              setTasks(prevTasks);
              toast.error(`Failed to delete list "${target.name}". Please try again.`);
            }
          }
        }}
        title="Delete List"
        description={`This deletes '${listToDelete?.name}' and all its tasks. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      {/* Rename List Dialog */}
      <InputDialog
        open={!!listToRename}
        onClose={() => setListToRename(null)}
        onSubmit={async (newName) => {
          if (listToRename) {
            try {
              const updated = await updateTaskList(listToRename.id, newName);
              setTaskLists(prev => prev.map(l => l.id === listToRename.id ? updated : l));
              toast.success(`List renamed to "${newName}"`);
            } catch {
              toast.error("Failed to rename list");
            }
          }
        }}
        title="Rename List"
        initialValue={listToRename?.name || ""}
        placeholder="Enter list name..."
        submitText="Save"
      />

      {/* Add New List Dialog */}
      <InputDialog
        open={showAddListModal}
        onClose={() => setShowAddListModal(false)}
        onSubmit={async (listName) => {
          const tempId = `temp-${Date.now()}`;
          const clientKey = `list-client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const maxPos = taskLists.reduce((max, l) => Math.max(max, l.position), 0);
          const optimisticList: TaskList = {
            id: tempId,
            boardId,
            name: listName,
            position: maxPos + 1000,
            createdAt: new Date().toISOString(),
            clientKey,
          };

          // 1. Immediately insert optimistic column
          setTaskLists((prev) => [...prev, optimisticList]);

          // 2. Smoothly scroll to the new column
          setTimeout(() => {
            scrollToColumn(tempId);
          }, 60);

          // 3. Send API call in background
          try {
            const created = await createTaskList(boardId, listName);
            setTaskLists((prev) => {
              // If WebSocket already arrived and inserted the list, remove the temp one
              if (prev.some((l) => l.id === created.id)) {
                return prev.filter((l) => l.id !== tempId && l.clientKey !== clientKey);
              }
              // Otherwise swap temp placeholder with the real server entity, preserving clientKey
              return prev.map((l) =>
                l.id === tempId || l.clientKey === clientKey ? { ...created, clientKey } : l
              );
            });
            toast.success(`List "${listName}" created!`);
          } catch {
            // Revert optimistic insertion on failure
            setTaskLists((prev) => prev.filter((l) => l.id !== tempId && l.clientKey !== clientKey));
            toast.error(`Failed to create list "${listName}". Please try again.`);
          }
        }}
        title="Add New List"
        placeholder="e.g. In Review"
        submitText="Create"
      />
    </div>
  );
}
