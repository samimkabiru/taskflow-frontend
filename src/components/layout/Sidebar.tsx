"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Settings, PanelLeftClose, PanelLeftOpen,
  ChevronRight, ChevronDown, Plus, CheckCircle2, X,
  Circle, UserCheck, Layers, Sparkles, Folder, ChevronsDownUp,
} from "lucide-react";
import { getBoards } from "@/services/boardService";
import { getMyTasks, getTaskListsForBoard, getTasksForList, getTaskById } from "@/services/taskService";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileNav } from "@/contexts/MobileNavContext";
import { useBoardWebSocket } from "@/hooks/useBoardWebSocket";
import CreateBoardModal from "@/components/boards/CreateBoardModal";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Board, TaskList, Task } from "@/lib/types";

const STORAGE_KEY = "taskflow-sidebar-collapsed";
const EXPANDED_BOARDS_KEY = "taskflow-sidebar-expanded-boards";
const EXPANDED_LISTS_KEY = "taskflow-sidebar-expanded-lists";

// ─── Column Status Dot Color Helper ─────────────────────────
function getListColor(listName: string) {
  const lower = listName.toLowerCase();
  if (lower.includes("done") || lower.includes("completed")) return "bg-emerald-500";
  if (lower.includes("progress") || lower.includes("doing") || lower.includes("active")) return "bg-primary";
  if (lower.includes("review") || lower.includes("testing") || lower.includes("qa")) return "bg-amber-500";
  return "bg-slate-400";
}

// ─── Priority Dot Color Helper ──────────────────────────────
function getPriorityDot(priority?: string | null) {
  switch (priority) {
    case "URGENT":
    case "HIGH":
      return "bg-error";
    case "MEDIUM":
      return "bg-tertiary";
    case "LOW":
      return "bg-secondary";
    default:
      return "bg-outline/40";
  }
}

// ─── Board Monogram Helper ──────────────────────────────────
function getBoardMonogram(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { isMobileSidebarOpen, closeMobileSidebar } = useMobileNav();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [enableTransition, setEnableTransition] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);

  // Expanded states for boards, lists, and my tasks
  const [expandedBoards, setExpandedBoards] = useState<Record<string, boolean>>({});
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});
  const [expandedMyTasks, setExpandedMyTasks] = useState(false);

  // Query boards & user tasks
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);

  // On-demand caches for 3-level tree
  const [boardListsMap, setBoardListsMap] = useState<Record<string, TaskList[]>>({});
  const [listTasksMap, setListTasksMap] = useState<Record<string, Task[]>>({});
  const [loadingBoardsMap, setLoadingBoardsMap] = useState<Record<string, boolean>>({});
  const [loadingListsMap, setLoadingListsMap] = useState<Record<string, boolean>>({});

  const fetchBoardLists = async (boardId: string) => {
    if (boardListsMap[boardId] || loadingBoardsMap[boardId]) return;
    setLoadingBoardsMap(prev => ({ ...prev, [boardId]: true }));
    try {
      const lists = await getTaskListsForBoard(boardId);
      setBoardListsMap(prev => ({ ...prev, [boardId]: lists }));
    } catch {
      // ignore
    } finally {
      setLoadingBoardsMap(prev => ({ ...prev, [boardId]: false }));
    }
  };

  const fetchListTasks = async (listId: string) => {
    if (listTasksMap[listId] || loadingListsMap[listId]) return;
    setLoadingListsMap(prev => ({ ...prev, [listId]: true }));
    try {
      const tasks = await getTasksForList(listId);
      setListTasksMap(prev => ({ ...prev, [listId]: tasks }));
    } catch {
      // ignore
    } finally {
      setLoadingListsMap(prev => ({ ...prev, [listId]: false }));
    }
  };

  const refreshSidebarBoards = useCallback(() => {
    getBoards().then(setAllBoards).catch(() => {});
    if (user) {
      getMyTasks().then(setMyTasks).catch(() => {});
    } else {
      setMyTasks([]);
    }
  }, [user]);

  useEffect(() => {
    refreshSidebarBoards();
  }, [pathname, refreshSidebarBoards]);

  useEffect(() => {
    const handleBoardsUpdated = () => {
      refreshSidebarBoards();
    };
    window.addEventListener("boards-updated", handleBoardsUpdated);
    return () => {
      window.removeEventListener("boards-updated", handleBoardsUpdated);
    };
  }, [refreshSidebarBoards]);

  // Read saved preferences on client mount and enable transition smoothly
  useEffect(() => {
    const savedCollapsed = localStorage.getItem(STORAGE_KEY);
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === "true");
    }

    try {
      const savedExpBoards = localStorage.getItem(EXPANDED_BOARDS_KEY);
      if (savedExpBoards) setExpandedBoards(JSON.parse(savedExpBoards));

      const savedExpLists = localStorage.getItem(EXPANDED_LISTS_KEY);
      if (savedExpLists) setExpandedLists(JSON.parse(savedExpLists));
    } catch {}

    const raf = requestAnimationFrame(() => {
      setEnableTransition(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fetch lists for expanded boards
  useEffect(() => {
    Object.keys(expandedBoards).forEach(bId => {
      if (expandedBoards[bId]) {
        fetchBoardLists(bId);
      }
    });
  }, [expandedBoards]);

  // Fetch tasks for expanded lists
  useEffect(() => {
    Object.keys(expandedLists).forEach(lId => {
      if (expandedLists[lId]) {
        fetchListTasks(lId);
      }
    });
  }, [expandedLists]);

  // Auto-expand current active board & column list if visiting /boards/[boardId] or /boards/[boardId]/tasks/[taskId]
  useEffect(() => {
    const taskMatch = pathname.match(/^\/boards\/([^\/]+)\/tasks\/([^\/]+)/);
    const boardMatch = pathname.match(/^\/boards\/([^\/]+)/);

    if (boardMatch && boardMatch[1] && boardMatch[1] !== "boards") {
      const activeBoardId = boardMatch[1];
      setExpandedBoards(prev => {
        if (prev[activeBoardId]) return prev;
        const next = { ...prev, [activeBoardId]: true };
        localStorage.setItem(EXPANDED_BOARDS_KEY, JSON.stringify(next));
        return next;
      });
      fetchBoardLists(activeBoardId);
    }

    if (taskMatch && taskMatch[2]) {
      const activeTaskId = taskMatch[2];
      getTaskById(activeTaskId)
        .then(task => {
          if (task && task.listId) {
            setExpandedLists(prev => {
              if (prev[task.listId]) return prev;
              const next = { ...prev, [task.listId]: true };
              localStorage.setItem(EXPANDED_LISTS_KEY, JSON.stringify(next));
              return next;
            });
            fetchListTasks(task.listId);
          }
        })
        .catch(() => {});
    }
  }, [pathname]);

  // Extract active board ID from pathname for real-time WebSocket updates
  const boardMatch = pathname.match(/^\/boards\/([^\/]+)/);
  const activeBoardId = boardMatch && boardMatch[1] !== "boards" ? boardMatch[1] : "";

  // Connect STOMP WebSocket for real-time tree synchronization
  useBoardWebSocket(activeBoardId, {
    onTaskUpdated: (updatedTask) => {
      setListTasksMap(prev => {
        const copy = { ...prev };
        for (const listId in copy) {
          copy[listId] = copy[listId].map(t =>
            t.id === updatedTask.id ? { ...t, ...updatedTask } : t
          );
        }
        return copy;
      });
      setMyTasks(prev =>
        prev.map(t => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
      );
    },
    onTaskCreated: (newTask) => {
      setListTasksMap(prev => {
        const listTasks = prev[newTask.listId] || [];
        if (listTasks.some(t => t.id === newTask.id)) return prev;
        return {
          ...prev,
          [newTask.listId]: [...listTasks, newTask].sort((a, b) => a.position - b.position),
        };
      });
      setAllBoards(prev =>
        prev.map(b => (b.id === activeBoardId ? { ...b, taskCount: (b.taskCount ?? 0) + 1 } : b))
      );
      if (user && (newTask.assigneeId === user.id || (newTask as any).assignee?.id === user.id)) {
        setMyTasks(prev => (prev.some(t => t.id === newTask.id) ? prev : [...prev, newTask]));
      }
    },
    onTaskDeleted: (taskId) => {
      setListTasksMap(prev => {
        const copy = { ...prev };
        for (const listId in copy) {
          copy[listId] = copy[listId].filter(t => t.id !== taskId);
        }
        return copy;
      });
      setMyTasks(prev => prev.filter(t => t.id !== taskId));
      setAllBoards(prev =>
        prev.map(b => (b.id === activeBoardId ? { ...b, taskCount: Math.max(0, (b.taskCount ?? 1) - 1) } : b))
      );
    },
    onTaskMoved: (movedTask) => {
      setListTasksMap(prev => {
        const copy = { ...prev };
        for (const listId in copy) {
          copy[listId] = copy[listId].filter(t => t.id !== movedTask.id);
        }
        const targetList = copy[movedTask.listId] || [];
        copy[movedTask.listId] = [...targetList, movedTask].sort((a, b) => a.position - b.position);
        return copy;
      });
      setMyTasks(prev =>
        prev.map(t => (t.id === movedTask.id ? { ...t, ...movedTask } : t))
      );
    },
    onListCreated: (newList) => {
      setBoardListsMap(prev => {
        const currentLists = prev[activeBoardId] || [];
        if (currentLists.some(l => l.id === newList.id)) return prev;
        return {
          ...prev,
          [activeBoardId]: [...currentLists, newList].sort((a, b) => a.position - b.position),
        };
      });
    },
    onListRenamed: (renamedList) => {
      setBoardListsMap(prev => {
        const currentLists = prev[activeBoardId] || [];
        return {
          ...prev,
          [activeBoardId]: currentLists.map(l => (l.id === renamedList.id ? renamedList : l)),
        };
      });
    },
    onListDeleted: (listId) => {
      setBoardListsMap(prev => {
        const currentLists = prev[activeBoardId] || [];
        return {
          ...prev,
          [activeBoardId]: currentLists.filter(l => l.id !== listId),
        };
      });
      setListTasksMap(prev => {
        const copy = { ...prev };
        delete copy[listId];
        return copy;
      });
    },
    onBoardUpdated: (updatedBoard) => {
      setAllBoards(prev =>
        prev.map(b => (b.id === updatedBoard.id ? { ...b, ...updatedBoard } : b))
      );
    },
    onMemberRemoved: (removedUserId) => {
      if (user && removedUserId === user.id) {
        refreshSidebarBoards();
      }
    },
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const toggleBoard = (boardId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const willExpand = !expandedBoards[boardId];
    setExpandedBoards(prev => {
      const next = { ...prev, [boardId]: willExpand };
      localStorage.setItem(EXPANDED_BOARDS_KEY, JSON.stringify(next));
      return next;
    });
    if (willExpand) {
      fetchBoardLists(boardId);
    }
  };

  const toggleList = (listId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const willExpand = !expandedLists[listId];
    setExpandedLists(prev => {
      const next = { ...prev, [listId]: willExpand };
      localStorage.setItem(EXPANDED_LISTS_KEY, JSON.stringify(next));
      return next;
    });
    if (willExpand) {
      fetchListTasks(listId);
    }
  };

  const hasAnyExpanded = useMemo(() => {
    return Object.values(expandedBoards).some(Boolean) || Object.values(expandedLists).some(Boolean);
  }, [expandedBoards, expandedLists]);

  const collapseAll = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedBoards({});
    setExpandedLists({});
    localStorage.setItem(EXPANDED_BOARDS_KEY, JSON.stringify({}));
    localStorage.setItem(EXPANDED_LISTS_KEY, JSON.stringify({}));
  };

  return (
    <>
      <nav
        className={cn(
          "hidden md:flex flex-col h-screen border-r border-outline-variant bg-surface sticky top-0 left-0 z-20 shrink-0 p-3 select-none overflow-hidden",
          enableTransition ? "transition-[width] duration-200 ease-in-out" : "transition-none",
          isCollapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* ── Fixed Top Section: Workspace Header, Quick Nav, Boards Header ── */}
        <div className="shrink-0 flex flex-col">
          {/* Workspace Header & Toggle */}
          <div
            className={cn(
              "flex items-center px-1 py-1 border-b border-outline-variant/30 pb-2.5 shrink-0",
              enableTransition ? "transition-all duration-200" : "transition-none",
              isCollapsed ? "justify-center flex-col gap-2" : "justify-between"
            )}
          >
            <Link href="/boards" className="flex items-center gap-2.5 min-w-0 group cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary font-[family-name:var(--font-heading)] font-bold text-xs shrink-0 shadow-xs group-hover:brightness-110 transition-all">
                TF
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="font-[family-name:var(--font-heading)] text-[14.5px] font-bold text-on-surface truncate leading-tight group-hover:text-primary transition-colors">
                    TaskFlow
                  </h2>
                  <p className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline tracking-wider uppercase">
                    Workspace
                  </p>
                </div>
              )}
            </Link>

            {/* Toggle Button */}
            <button
              onClick={toggleSidebar}
              className={cn(
                "p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-high rounded-lg transition-colors cursor-pointer shrink-0",
                isCollapsed && "mt-1"
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>

          {/* Quick Navigation (All Boards, My Tasks) */}
          <div className="flex flex-col gap-0.5 pt-2 pb-2 border-b border-outline-variant/20">
            {/* All Boards */}
            <div className="relative">
              <Link
                href="/boards"
                className={cn(
                  "flex items-center gap-2.5 py-1.5 rounded-xl font-[family-name:var(--font-body)] text-[13px] font-medium transition-all group",
                  isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-2.5",
                  pathname === "/boards"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-high/70 hover:text-on-surface"
                )}
              >
                <LayoutDashboard size={16} className="shrink-0 text-outline group-hover:text-on-surface" />
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1">All Boards</span>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-low/80 border border-outline-variant/40">
                      {allBoards.length}
                    </span>
                  </>
                )}
              </Link>
            </div>

            {/* My Tasks (Expandable Accordion) */}
            {user && (
              <div className="relative flex flex-col">
                {isCollapsed ? (
                  <SimpleTooltip content={`My Tasks (${myTasks.length})`}>
                    <button
                      type="button"
                      onClick={() => setIsCollapsed(false)}
                      className={cn(
                        "flex items-center justify-center rounded-xl h-10 w-10 mx-auto text-on-surface-variant hover:bg-surface-high/70 hover:text-on-surface transition-all cursor-pointer",
                        myTasks.length > 0 && "text-primary"
                      )}
                    >
                      <UserCheck size={16} />
                    </button>
                  </SimpleTooltip>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedMyTasks(prev => !prev)}
                      className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl font-[family-name:var(--font-body)] text-[13px] font-medium transition-all cursor-pointer text-left group text-on-surface-variant hover:bg-surface-high/70 hover:text-on-surface"
                    >
                      <UserCheck size={16} className="shrink-0 text-outline group-hover:text-on-surface" />
                      <span className="truncate flex-1">My Tasks</span>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-low/80 border border-outline-variant/40">
                        {myTasks.length}
                      </span>
                      <span className="text-outline group-hover:text-on-surface transition-transform">
                        {expandedMyTasks ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </span>
                    </button>

                    {/* My Tasks Sub-list */}
                    <AnimatePresence initial={false}>
                      {expandedMyTasks && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="overflow-hidden flex flex-col pl-4 border-l border-outline-variant/30 ml-3.5 mt-1 gap-0.5 max-h-48 overflow-y-auto custom-scrollbar"
                        >
                          {myTasks.length === 0 ? (
                            <span className="font-[family-name:var(--font-body)] text-[11px] text-outline italic py-1 pl-2">
                              No tasks assigned to you
                            </span>
                          ) : (
                            myTasks.map(task => {
                              const parentBoard = allBoards.find(b => b.id === task.boardId);
                              const isTaskActive = pathname.includes(task.id);
                              const priorityDot = getPriorityDot(task.priority);

                              return (
                                <Link
                                  key={task.id}
                                  href={`/boards/${task.boardId}/tasks/${task.id}`}
                                  className={cn(
                                    "group/mytask flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11.5px] font-[family-name:var(--font-body)] transition-colors",
                                    isTaskActive
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high/60"
                                  )}
                                >
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot)} />
                                  <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline shrink-0">
                                    {task.shortCode}
                                  </span>
                                  <span className="truncate flex-1">
                                    {task.title}
                                  </span>
                                  {parentBoard && (
                                    <SimpleTooltip content={parentBoard.name}>
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60"
                                        style={{ backgroundColor: parentBoard.accentColor || "var(--color-primary)" }}
                                      />
                                    </SimpleTooltip>
                                  )}
                                </Link>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Boards Section Header (Fixed directly above scroll area) */}
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 py-2 shrink-0">
              <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-outline uppercase tracking-wider">
                Boards ({allBoards.length})
              </span>
              <div className="flex items-center gap-0.5">
                {/* Collapse All Button */}
                <SimpleTooltip content={hasAnyExpanded ? "Collapse all boards" : "All boards collapsed"}>
                  <button
                    type="button"
                    onClick={collapseAll}
                    disabled={!hasAnyExpanded}
                    className={cn(
                      "p-1 rounded-md transition-all cursor-pointer",
                      hasAnyExpanded
                        ? "text-outline hover:text-on-surface hover:bg-surface-high opacity-70 group-hover:opacity-100"
                        : "text-outline/30 cursor-not-allowed opacity-0 group-hover:opacity-30"
                    )}
                    aria-label="Collapse all boards"
                  >
                    <ChevronsDownUp size={13} />
                  </button>
                </SimpleTooltip>

                {/* Create Board Button */}
                <SimpleTooltip content="Create new board">
                  <button
                    type="button"
                    onClick={() => setShowCreateBoardModal(true)}
                    className="p-1 rounded-md text-outline hover:text-primary hover:bg-surface-high opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                    aria-label="Create new board"
                  >
                    <Plus size={13} />
                  </button>
                </SimpleTooltip>
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable Board Tree Body ─────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden flex flex-col gap-1 pt-0.5 pb-2 pr-0.5">
          {!isCollapsed ? (
            <div className="flex flex-col gap-1">
              {allBoards.map(board => {
                const isBoardActive = pathname === `/boards/${board.id}` || pathname.startsWith(`/boards/${board.id}/`);
                const isExpanded = !!expandedBoards[board.id];
                const boardLists = boardListsMap[board.id] || [];
                const isLoadingLists = !!loadingBoardsMap[board.id];
                const boardTaskCount = board.taskCount ?? 0;

                return (
                  <div key={board.id} className="flex flex-col">
                    {/* Level 1: Board Row */}
                    <div
                      className={cn(
                        "group/board flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl text-[13px] font-[family-name:var(--font-body)] font-medium transition-colors cursor-pointer",
                        isBoardActive
                          ? "bg-surface-low text-on-surface font-semibold shadow-2xs"
                          : "text-on-surface-variant hover:bg-surface-high/60 hover:text-on-surface"
                      )}
                    >
                      <Link
                        href={`/boards/${board.id}`}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: board.accentColor || "var(--color-primary)" }}
                        />
                        <span className="truncate flex-1 text-[13px]">{board.name}</span>
                        <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline opacity-70 group-hover/board:opacity-100">
                          {boardTaskCount}
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => toggleBoard(board.id, e)}
                        className="p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-high/80 transition-colors cursor-pointer shrink-0"
                        aria-label={isExpanded ? "Collapse board" : "Expand board"}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    </div>

                    {/* Level 2: Lists / Columns */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="overflow-hidden flex flex-col pl-3 border-l border-outline-variant/30 ml-3.5 mt-0.5 gap-0.5"
                        >
                          {isLoadingLists ? (
                            <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline italic py-1 pl-2 animate-pulse">
                              Loading lists...
                            </span>
                          ) : boardLists.length === 0 ? (
                            <span className="font-[family-name:var(--font-body)] text-[11px] text-outline italic py-1 pl-2">
                              No lists created
                            </span>
                          ) : (
                            boardLists.map(list => {
                              const isListExpanded = !!expandedLists[list.id];
                              const listTasks = listTasksMap[list.id] || [];
                              const isLoadingTasks = !!loadingListsMap[list.id];
                              const listColor = getListColor(list.name);

                              return (
                                <div key={list.id} className="flex flex-col">
                                  {/* List Row */}
                                  <div
                                    className="group/list flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[12px] font-[family-name:var(--font-body)] text-on-surface-variant hover:text-on-surface hover:bg-surface-high/50 transition-colors cursor-pointer"
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => toggleList(list.id, e)}
                                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                    >
                                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", listColor)} />
                                      <span className="truncate flex-1 font-medium">{list.name}</span>
                                      {listTasks.length > 0 && (
                                        <span className="font-[family-name:var(--font-mono)] text-[9px] text-outline">
                                          {listTasks.length}
                                        </span>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => toggleList(list.id, e)}
                                      className="p-0.5 rounded text-outline hover:text-on-surface transition-colors cursor-pointer shrink-0"
                                      aria-label={isListExpanded ? "Collapse list" : "Expand list"}
                                    >
                                      {isListExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    </button>
                                  </div>

                                  {/* Level 3: Tasks */}
                                  <AnimatePresence initial={false}>
                                    {isListExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.14, ease: "easeOut" }}
                                        className="overflow-hidden flex flex-col pl-3 border-l border-outline-variant/25 ml-2.5 mt-0.5 gap-0.5"
                                      >
                                        {isLoadingTasks ? (
                                          <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline italic py-0.5 pl-2 animate-pulse">
                                            Loading tasks...
                                          </span>
                                        ) : listTasks.length === 0 ? (
                                          <span className="font-[family-name:var(--font-body)] text-[10.5px] text-outline italic py-0.5 pl-2">
                                            Empty list
                                          </span>
                                        ) : (
                                          listTasks.map(task => {
                                            const isTaskActive = pathname.includes(task.id);
                                            const priorityDot = getPriorityDot(task.priority);

                                            return (
                                              <Link
                                                key={task.id}
                                                href={`/boards/${board.id}/tasks/${task.id}`}
                                                className={cn(
                                                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-[family-name:var(--font-body)] transition-colors",
                                                  isTaskActive
                                                    ? "bg-primary/10 text-primary font-semibold"
                                                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high/60"
                                                )}
                                              >
                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot)} />
                                                <span className="font-[family-name:var(--font-mono)] text-[9px] text-outline shrink-0">
                                                  {task.shortCode}
                                                </span>
                                                <span className="truncate flex-1">
                                                  {task.title}
                                                </span>
                                              </Link>
                                            );
                                          })
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Collapsed Rail Mode (Monogram Avatar Tiles) ───── */
            <div className="flex flex-col items-center gap-2 pt-2 border-t border-outline-variant/30">
              {allBoards.map(board => {
                const isActive = pathname.startsWith(`/boards/${board.id}`);
                const monogram = getBoardMonogram(board.name);

                return (
                  <SimpleTooltip
                    key={board.id}
                    content={`${board.name} • ${board.taskCount ?? 0} tasks`}
                    side="right"
                    sideOffset={8}
                  >
                    <Link
                      href={`/boards/${board.id}`}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer font-[family-name:var(--font-heading)] font-bold text-[11.5px] relative group shadow-2xs",
                        isActive
                          ? "bg-primary text-on-primary shadow-xs ring-2 ring-primary/20 scale-102"
                          : "bg-surface-low border border-outline-variant/60 text-on-surface hover:bg-surface-high hover:border-outline-variant hover:scale-102"
                      )}
                    >
                      <span>{monogram}</span>

                      {/* Micro Accent Dot */}
                      <span
                        className={cn(
                          "absolute top-1 right-1 w-2 h-2 rounded-full border border-surface",
                          isActive ? "ring-1 ring-white/40" : ""
                        )}
                        style={{ backgroundColor: board.accentColor || "var(--color-primary)" }}
                      />
                    </Link>
                  </SimpleTooltip>
                );
              })}

              <SimpleTooltip content="Create New Board" side="right" sideOffset={8}>
                <button
                  type="button"
                  onClick={() => setShowCreateBoardModal(true)}
                  className="w-10 h-10 rounded-xl border border-dashed border-outline-variant hover:border-primary text-outline hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all cursor-pointer mt-1"
                  aria-label="Create New Board"
                >
                  <Plus size={16} />
                </button>
              </SimpleTooltip>
            </div>
          )}
        </div>

        {/* ── Footer: Settings & Profile ───────────────────────── */}
        <div className="pt-2 border-t border-outline-variant/30 shrink-0">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 py-2 rounded-xl font-[family-name:var(--font-body)] text-[13px] font-medium transition-all group",
              isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-2.5",
              pathname === "/settings"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-on-surface-variant hover:bg-surface-high/70 hover:text-on-surface"
            )}
          >
            <Settings size={16} className="shrink-0 text-outline group-hover:text-on-surface" />
            {!isCollapsed && <span className="truncate flex-1">Settings</span>}
          </Link>
        </div>
      </nav>

      {/* ── Mobile Slide-out Drawer ─────────────────────────── */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileSidebar}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-[300px] max-w-[85vw] h-full bg-surface border-r border-outline-variant flex flex-col p-3 shadow-2xl overflow-hidden select-none z-10"
            >
              {/* Header with Close X */}
              <div className="flex items-center justify-between px-1 py-1 border-b border-outline-variant/30 pb-2.5 shrink-0">
                <Link
                  href="/boards"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary font-[family-name:var(--font-heading)] font-bold text-xs shrink-0 shadow-xs">
                    TF
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-[family-name:var(--font-heading)] text-[14.5px] font-bold text-on-surface truncate leading-tight">
                      TaskFlow
                    </h2>
                    <p className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline tracking-wider uppercase">
                      Workspace
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-high rounded-lg transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Navigation (All Boards, My Tasks) */}
              <div className="flex flex-col gap-0.5 pt-2 pb-2 border-b border-outline-variant/20 shrink-0">
                <Link
                  href="/boards"
                  onClick={closeMobileSidebar}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl font-[family-name:var(--font-body)] text-[13px] font-medium transition-all",
                    pathname === "/boards"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-on-surface-variant hover:bg-surface-high/70 hover:text-on-surface"
                  )}
                >
                  <LayoutDashboard size={16} className="shrink-0 text-outline" />
                  <span className="truncate flex-1">All Boards</span>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-low/80 border border-outline-variant/40">
                    {allBoards.length}
                  </span>
                </Link>

                {/* My Tasks */}
                {user && (
                  <div className="relative flex flex-col">
                    <button
                      type="button"
                      onClick={() => setExpandedMyTasks(prev => !prev)}
                      className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl font-[family-name:var(--font-body)] text-[13px] font-medium transition-all cursor-pointer text-left text-on-surface-variant hover:bg-surface-high/70 hover:text-on-surface"
                    >
                      <UserCheck size={16} className="shrink-0 text-outline" />
                      <span className="truncate flex-1">My Tasks</span>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-low/80 border border-outline-variant/40">
                        {myTasks.length}
                      </span>
                      <span className="text-outline">
                        {expandedMyTasks ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedMyTasks && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="overflow-hidden flex flex-col pl-4 border-l border-outline-variant/30 ml-3.5 mt-1 gap-0.5 max-h-44 overflow-y-auto custom-scrollbar"
                        >
                          {myTasks.length === 0 ? (
                            <span className="font-[family-name:var(--font-body)] text-[11px] text-outline italic py-1 pl-2">
                              No tasks assigned to you
                            </span>
                          ) : (
                            myTasks.map(task => {
                              const isTaskActive = pathname.includes(task.id);
                              const priorityDot = getPriorityDot(task.priority);

                              return (
                                <Link
                                  key={task.id}
                                  href={`/boards/${task.boardId}/tasks/${task.id}`}
                                  onClick={closeMobileSidebar}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11.5px] font-[family-name:var(--font-body)] transition-colors",
                                    isTaskActive
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high/60"
                                  )}
                                >
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot)} />
                                  <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline shrink-0">
                                    {task.shortCode}
                                  </span>
                                  <span className="truncate flex-1">
                                    {task.title}
                                  </span>
                                </Link>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Boards Section Header */}
              <div className="flex items-center justify-between px-2 py-2 shrink-0">
                <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-outline uppercase tracking-wider">
                  Boards ({allBoards.length})
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={collapseAll}
                    disabled={!hasAnyExpanded}
                    className="p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-high disabled:opacity-30 cursor-pointer"
                    aria-label="Collapse all boards"
                  >
                    <ChevronsDownUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileSidebar();
                      setShowCreateBoardModal(true);
                    }}
                    className="p-1 rounded-md text-outline hover:text-primary hover:bg-surface-high cursor-pointer"
                    aria-label="Create new board"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Scrollable Boards List in Drawer */}
              <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden flex flex-col gap-1 pt-0.5 pb-2 pr-0.5">
                {allBoards.map(board => {
                  const isBoardActive = pathname === `/boards/${board.id}` || pathname.startsWith(`/boards/${board.id}/`);
                  const isExpanded = !!expandedBoards[board.id];
                  const boardLists = boardListsMap[board.id] || [];
                  const isLoadingLists = !!loadingBoardsMap[board.id];
                  const boardTaskCount = board.taskCount ?? 0;

                  return (
                    <div key={board.id} className="flex flex-col">
                      {/* Board Row */}
                      <div
                        className={cn(
                          "group/board flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl text-[13px] font-[family-name:var(--font-body)] font-medium transition-colors cursor-pointer",
                          isBoardActive
                            ? "bg-surface-low text-on-surface font-semibold shadow-2xs"
                            : "text-on-surface-variant hover:bg-surface-high/60 hover:text-on-surface"
                        )}
                      >
                        <Link
                          href={`/boards/${board.id}`}
                          onClick={closeMobileSidebar}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: board.accentColor || "var(--color-primary)" }}
                          />
                          <span className="truncate flex-1">{board.name}</span>
                          <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline opacity-70 group-hover/board:opacity-100">
                            {boardTaskCount}
                          </span>
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => toggleBoard(board.id, e)}
                          className="p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-high/80 transition-colors cursor-pointer shrink-0"
                          aria-label={isExpanded ? "Collapse board" : "Expand board"}
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      </div>

                      {/* Lists */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="overflow-hidden flex flex-col pl-3 border-l border-outline-variant/30 ml-3.5 mt-0.5 gap-0.5"
                          >
                            {isLoadingLists ? (
                              <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline italic py-1 pl-2 animate-pulse">
                                Loading lists...
                              </span>
                            ) : boardLists.length === 0 ? (
                              <span className="font-[family-name:var(--font-body)] text-[11px] text-outline italic py-1 pl-2">
                                No lists created
                              </span>
                            ) : (
                              boardLists.map(list => {
                                const isListExpanded = !!expandedLists[list.id];
                                const listTasks = listTasksMap[list.id] || [];
                                const isLoadingTasks = !!loadingListsMap[list.id];
                                const listColor = getListColor(list.name);

                                return (
                                  <div key={list.id} className="flex flex-col">
                                    <div
                                      className="group/list flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[12px] font-[family-name:var(--font-body)] text-on-surface-variant hover:text-on-surface hover:bg-surface-high/50 transition-colors cursor-pointer"
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => toggleList(list.id, e)}
                                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                      >
                                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", listColor)} />
                                        <span className="truncate flex-1 font-medium">{list.name}</span>
                                        {listTasks.length > 0 && (
                                          <span className="font-[family-name:var(--font-mono)] text-[9px] text-outline">
                                            {listTasks.length}
                                          </span>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => toggleList(list.id, e)}
                                        className="p-0.5 rounded text-outline hover:text-on-surface transition-colors cursor-pointer shrink-0"
                                        aria-label={isListExpanded ? "Collapse list" : "Expand list"}
                                      >
                                        {isListExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                      </button>
                                    </div>

                                    {/* Tasks */}
                                    <AnimatePresence initial={false}>
                                      {isListExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.14, ease: "easeOut" }}
                                          className="overflow-hidden flex flex-col pl-3 border-l border-outline-variant/25 ml-2.5 mt-0.5 gap-0.5"
                                        >
                                          {isLoadingTasks ? (
                                            <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline italic py-0.5 pl-2 animate-pulse">
                                              Loading tasks...
                                            </span>
                                          ) : listTasks.length === 0 ? (
                                            <span className="font-[family-name:var(--font-body)] text-[10.5px] text-outline italic py-0.5 pl-2">
                                              Empty list
                                            </span>
                                          ) : (
                                            listTasks.map(task => {
                                              const isTaskActive = pathname.includes(task.id);
                                              const priorityDot = getPriorityDot(task.priority);

                                              return (
                                                <Link
                                                  key={task.id}
                                                  href={`/boards/${board.id}/tasks/${task.id}`}
                                                  onClick={closeMobileSidebar}
                                                  className={cn(
                                                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-[family-name:var(--font-body)] transition-colors",
                                                    isTaskActive
                                                      ? "bg-primary/10 text-primary font-semibold"
                                                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high/60"
                                                  )}
                                                >
                                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot)} />
                                                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-outline shrink-0">
                                                    {task.shortCode}
                                                  </span>
                                                  <span className="truncate flex-1">
                                                    {task.title}
                                                  </span>
                                                </Link>
                                              );
                                            })
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="pt-2 border-t border-outline-variant/30 shrink-0">
                <Link
                  href="/settings"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl font-[family-name:var(--font-body)] text-[13px] font-medium text-on-surface-variant hover:bg-surface-high/70 hover:text-on-surface transition-all"
                >
                  <Settings size={16} className="shrink-0 text-outline" />
                  <span className="truncate flex-1">Settings</span>
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Create Board Modal Trigger */}
      <CreateBoardModal
        open={showCreateBoardModal}
        onClose={() => setShowCreateBoardModal(false)}
      />
    </>
  );
}
