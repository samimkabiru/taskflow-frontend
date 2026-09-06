"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, LayoutDashboard, Plus, Sun, Moon,
  CheckCircle2, Circle, ArrowRight, Sparkles, Settings,
  ArrowUpRight,
} from "lucide-react";
import { getBoards } from "@/services/boardService";
import { getTasksForBoard } from "@/services/taskService";
import { useTheme } from "@/contexts/ThemeContext";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Board, Task, Priority } from "@/lib/types";

interface CommandSearchModalProps {
  open: boolean;
  onClose: () => void;
  onOpenCreateBoard?: () => void;
}

type SearchTab = "all" | "tasks" | "boards";

type BoardSearchItem = { type: "board"; id: string; board: Board };
type TaskSearchItem = { type: "task"; id: string; task: Task; boardName: string; boardColor?: string };
type ActionSearchItem = {
  type: "action";
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  onSelect: () => void;
};

type SearchItem = BoardSearchItem | TaskSearchItem | ActionSearchItem;

const PRIORITY_BADGES: Record<Priority, { color: string; label: string }> = {
  LOW: { color: "bg-secondary/15 text-secondary border-secondary/25", label: "Low" },
  MEDIUM: { color: "bg-tertiary/15 text-tertiary border-tertiary/25", label: "Med" },
  HIGH: { color: "bg-error/15 text-error border-error/25", label: "High" },
  URGENT: { color: "bg-error/25 text-error border-error/40 font-bold", label: "Urgent" },
};

export default function CommandSearchModal({
  open,
  onClose,
  onOpenCreateBoard,
}: CommandSearchModalProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [allTasks, setAllTasks] = useState<{ task: Task; boardName: string; boardColor?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input & load boards + tasks when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveTab("all");
      setSelectedIndex(0);
      setLoading(true);

      getBoards()
        .then(async (boards) => {
          setAllBoards(boards);
          // Preload tasks across boards in parallel for instant, lag-free search
          const taskResults = await Promise.all(
            boards.map(async (b) => {
              try {
                const tasks = await getTasksForBoard(b.id);
                return tasks.map((t) => ({
                  task: t,
                  boardName: b.name,
                  boardColor: b.accentColor,
                }));
              } catch {
                return [];
              }
            })
          );
          setAllTasks(taskResults.flat());
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Collect results based on query
  const { matchedBoards, matchedTasks, matchedActions, defaultActions } = useMemo<{
    matchedBoards: BoardSearchItem[];
    matchedTasks: TaskSearchItem[];
    matchedActions: ActionSearchItem[];
    defaultActions: ActionSearchItem[];
  }>(() => {
    const trimmed = query.trim().toLowerCase();

    // Default quick actions when query is empty
    const defActions: ActionSearchItem[] = [
      ...(onOpenCreateBoard ? [{
        type: "action" as const,
        id: "action-new-board",
        title: "Create New Board",
        subtitle: "Set up a new workflow and project",
        icon: Plus,
        onSelect: () => {
          onClose();
          onOpenCreateBoard();
        },
      }] : []),
      {
        type: "action" as const,
        id: "action-my-boards",
        title: "Go to My Boards",
        subtitle: "View and manage all workspaces",
        icon: LayoutDashboard,
        onSelect: () => {
          onClose();
          router.push("/boards");
        },
      },
      {
        type: "action" as const,
        id: "action-settings",
        title: "Settings & Profile",
        subtitle: "Account preferences, notifications, theme",
        icon: Settings,
        onSelect: () => {
          onClose();
          router.push("/settings");
        },
      },
      {
        type: "action" as const,
        id: "action-theme",
        title: `Switch Theme to ${theme === "dark" ? "Light" : "Dark"}`,
        subtitle: `Currently in ${theme} mode`,
        icon: theme === "dark" ? Sun : Moon,
        onSelect: () => {
          setTheme(theme === "dark" ? "light" : "dark");
        },
      },
    ];

    if (!trimmed) {
      const bItems: BoardSearchItem[] = allBoards.map((b) => ({
        type: "board",
        id: `board-${b.id}`,
        board: b,
      }));

      return {
        matchedBoards: bItems,
        matchedTasks: [], // No tasks shown before user searches
        matchedActions: [],
        defaultActions: defActions,
      };
    }

    // Filter matching boards
    const bFiltered: BoardSearchItem[] = allBoards
      .filter(
        (b) =>
          b.name.toLowerCase().includes(trimmed) ||
          b.description?.toLowerCase().includes(trimmed)
      )
      .map((b) => ({
        type: "board",
        id: `board-${b.id}`,
        board: b,
      }));

    // Filter matching tasks by title, short code, description, and labels
    const tFiltered: TaskSearchItem[] = allTasks
      .filter((item) => {
        const titleMatch = item.task.title.toLowerCase().includes(trimmed);
        const codeMatch = item.task.shortCode.toLowerCase().includes(trimmed);
        const descMatch = item.task.description?.toLowerCase().includes(trimmed);
        const labelMatch = item.task.labels?.some((l) => l.name.toLowerCase().includes(trimmed));
        const boardMatch = item.boardName.toLowerCase().includes(trimmed);
        return titleMatch || codeMatch || descMatch || labelMatch || boardMatch;
      })
      .map((item) => ({
        type: "task",
        id: `task-${item.task.id}`,
        task: item.task,
        boardName: item.boardName,
        boardColor: item.boardColor,
      }));

    // Filter matching actions
    const aFiltered: ActionSearchItem[] = [];
    if ("create new board".includes(trimmed) && onOpenCreateBoard) {
      aFiltered.push({
        type: "action",
        id: "action-new-board",
        title: "Create New Board",
        icon: Plus,
        onSelect: () => {
          onClose();
          onOpenCreateBoard();
        },
      });
    }
    if ("settings profile account theme".includes(trimmed)) {
      aFiltered.push({
        type: "action",
        id: "action-settings",
        title: "Settings & Profile",
        icon: Settings,
        onSelect: () => {
          onClose();
          router.push("/settings");
        },
      });
    }

    return {
      matchedBoards: bFiltered,
      matchedTasks: tFiltered,
      matchedActions: aFiltered,
      defaultActions: defActions,
    };
  }, [query, allBoards, allTasks, onOpenCreateBoard, onClose, router, theme, setTheme]);

  // Group matching tasks by Board Name (only when user enters a search query)
  const tasksByBoard = useMemo(() => {
    if (!query.trim()) return [];

    const map = new Map<
      string,
      {
        boardId: string;
        boardName: string;
        boardColor?: string;
        items: TaskSearchItem[];
      }
    >();

    for (const item of matchedTasks) {
      const bId = item.task.boardId || item.boardName;
      if (!map.has(bId)) {
        map.set(bId, {
          boardId: bId,
          boardName: item.boardName,
          boardColor: item.boardColor,
          items: [],
        });
      }
      map.get(bId)!.items.push(item);
    }

    return Array.from(map.values());
  }, [query, matchedTasks]);

  // Tasks in exact visual order as rendered on screen
  const tasksInDisplayOrder = useMemo(() => {
    return tasksByBoard.flatMap((bg) => bg.items);
  }, [tasksByBoard]);

  // Compute selectable flat list based on activeTab
  const selectableItems: SearchItem[] = useMemo(() => {
    const isQueryEmpty = !query.trim();

    if (activeTab === "boards") {
      return matchedBoards;
    }

    if (activeTab === "tasks") {
      return tasksInDisplayOrder;
    }

    // "all" tab
    if (isQueryEmpty) {
      return [...matchedBoards.slice(0, 4), ...defaultActions];
    }

    return [...matchedBoards, ...tasksInDisplayOrder, ...matchedActions];
  }, [activeTab, query, matchedBoards, tasksInDisplayOrder, matchedActions, defaultActions]);

  // Active item determined by selectedIndex
  const selectedItem = selectableItems[selectedIndex] as SearchItem | undefined;

  // Reset selected index when active tab, query, or item count changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeTab, query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-selected="true"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Execute selection
  const handleSelect = (item: SearchItem) => {
    if (item.type === "board") {
      onClose();
      router.push(`/boards/${item.board.id}`);
    } else if (item.type === "task") {
      onClose();
      router.push(`/boards/${item.task.boardId}/tasks/${item.task.id}`);
    } else if (item.type === "action") {
      item.onSelect();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      // Cycle tabs: All -> Tasks -> Boards -> All
      e.preventDefault();
      const tabs: SearchTab[] = ["all", "tasks", "boards"];
      const currentIdx = tabs.indexOf(activeTab);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + tabs.length) % tabs.length
        : (currentIdx + 1) % tabs.length;
      setActiveTab(tabs[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, selectableItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + selectableItems.length) % Math.max(1, selectableItems.length));
    } else if (e.key === "Enter" && selectableItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(selectableItems[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const isQueryEmpty = !query.trim();

  // Counts for tabs
  const boardsCount = matchedBoards.length;
  const tasksCount = matchedTasks.length;
  const allCount = isQueryEmpty
    ? Math.min(4, boardsCount) + defaultActions.length
    : boardsCount + tasksCount + matchedActions.length;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 sm:px-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-2xl rounded-2xl bg-surface border border-outline-variant/60 shadow-2xl overflow-hidden flex flex-col z-10 max-h-[82vh]"
            onKeyDown={handleKeyDown}
          >
            {/* ── Search Input Bar ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/30 bg-surface-low/50">
              <Search size={17} className="text-primary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, boards, commands..."
                className="flex-1 bg-transparent border-none font-[family-name:var(--font-body)] text-[13.5px] sm:text-[14px] text-on-surface placeholder:text-outline placeholder:text-[13px] sm:placeholder:text-[13.5px] focus:outline-none focus:ring-0 leading-normal"
              />
              {query && (
                <SimpleTooltip content="Clear search">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                </SimpleTooltip>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-md border border-outline-variant bg-surface text-outline select-none">
                ESC
              </kbd>
            </div>

            {/* ── Category Filter Tabs (All, Tasks, Boards) ── */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-outline-variant/30 bg-surface-low/30 select-none">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  activeTab === "all"
                    ? "bg-primary text-on-primary shadow-xs font-semibold"
                    : "text-outline hover:text-on-surface hover:bg-surface-high/60"
                )}
              >
                <span>All</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full leading-tight",
                    activeTab === "all" ? "bg-white/20 text-white" : "bg-surface-container text-outline"
                  )}
                >
                  {allCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={cn(
                  "px-3 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  activeTab === "tasks"
                    ? "bg-primary text-on-primary shadow-xs font-semibold"
                    : "text-outline hover:text-on-surface hover:bg-surface-high/60"
                )}
              >
                <CheckCircle2 size={12} />
                <span>Tasks</span>
                {tasksCount > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full leading-tight",
                      activeTab === "tasks" ? "bg-white/20 text-white" : "bg-surface-container text-outline"
                    )}
                  >
                    {tasksCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("boards")}
                className={cn(
                  "px-3 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  activeTab === "boards"
                    ? "bg-primary text-on-primary shadow-xs font-semibold"
                    : "text-outline hover:text-on-surface hover:bg-surface-high/60"
                )}
              >
                <LayoutDashboard size={12} />
                <span>Boards</span>
                {boardsCount > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full leading-tight",
                      activeTab === "boards" ? "bg-white/20 text-white" : "bg-surface-container text-outline"
                    )}
                  >
                    {boardsCount}
                  </span>
                )}
              </button>

              <span className="ml-auto text-[10.5px] font-[family-name:var(--font-mono)] text-outline/70 hidden sm:inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-outline-variant/60 bg-surface text-[9.5px]">Tab</kbd>
                switch tab
              </span>
            </div>

            {/* ── Suggestions & Results List ── */}
            <div
              ref={listRef}
              className="overflow-y-auto custom-scrollbar p-2 flex flex-col gap-3 min-h-[140px] max-h-[480px]"
            >
              {loading && selectableItems.length === 0 ? (
                <div className="py-12 text-center px-4 flex flex-col items-center justify-center">
                  <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                  <p className="font-[family-name:var(--font-body)] text-[13px] text-outline">
                    Searching workspace...
                  </p>
                </div>
              ) : selectableItems.length === 0 ? (
                <div className="py-12 text-center px-4 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-surface-low flex items-center justify-center mb-3 text-outline">
                    <Search size={22} />
                  </div>
                  <p className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-on-surface mb-1">
                    {isQueryEmpty
                      ? activeTab === "tasks"
                        ? "Search for tasks"
                        : "No items available"
                      : `No results for "${query}"`}
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant max-w-xs">
                    {isQueryEmpty
                      ? activeTab === "tasks"
                        ? "Type a task title, short code, or keyword to see recommendations under their boards."
                        : "Create a new board to get started."
                      : activeTab === "tasks"
                      ? "No tasks found matching your search."
                      : activeTab === "boards"
                      ? "No boards found matching your search."
                      : "Try searching with another task title, short code, or board name."}
                  </p>
                </div>
              ) : (
                <>
                  {/* ── Boards Group (Visible in "all" and "boards" tabs) ── */}
                  {(activeTab === "all" || activeTab === "boards") && matchedBoards.length > 0 && (
                    <div>
                      <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-outline uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5">
                        <LayoutDashboard size={12} />
                        <span>{isQueryEmpty ? "Recent Boards" : `Boards (${matchedBoards.length})`}</span>
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {(activeTab === "boards" || !isQueryEmpty ? matchedBoards : matchedBoards.slice(0, 4)).map(
                          (item) => {
                            const isSelected = selectedItem?.id === item.id;
                            const board = item.board;
                            return (
                              <button
                                key={item.id}
                                data-selected={isSelected ? "true" : "false"}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => {
                                  const idx = selectableItems.findIndex((it) => it.id === item.id);
                                  if (idx !== -1) setSelectedIndex(idx);
                                }}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer w-full group",
                                  isSelected
                                    ? "bg-primary/10 text-on-surface"
                                    : "hover:bg-surface-low/70 text-on-surface"
                                )}
                              >
                                <div
                                  className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                                  style={{ backgroundColor: board.accentColor || "var(--color-primary)" }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-[family-name:var(--font-heading)] text-[13.5px] font-semibold truncate leading-tight">
                                    {board.name}
                                  </p>
                                  <p className="font-[family-name:var(--font-body)] text-[11.5px] text-on-surface-variant truncate mt-0.5">
                                    {board.description || "No description"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {board.taskCount !== undefined && (
                                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-low">
                                      {board.taskCount} tasks
                                    </span>
                                  )}
                                  <ArrowUpRight
                                    size={13}
                                    className={cn(
                                      "text-outline transition-opacity",
                                      isSelected ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-60"
                                    )}
                                  />
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Tasks Grouped Under Their Board Names (Recommendations shown only when searching) ── */}
                  {(activeTab === "all" || activeTab === "tasks") && !isQueryEmpty && tasksByBoard.length > 0 && (
                    <div className="space-y-3">
                      <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-outline uppercase tracking-wider px-3 py-1 flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        <span>Task Recommendations ({matchedTasks.length})</span>
                      </p>

                      {tasksByBoard.map((boardGroup) => (
                        <div
                          key={boardGroup.boardId}
                          className="bg-surface-lowest/60 rounded-xl border border-outline-variant/30 overflow-hidden"
                        >
                          {/* Board Name Group Header */}
                          <div className="px-3 py-1.5 bg-surface-low/50 border-b border-outline-variant/20 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: boardGroup.boardColor || "var(--color-primary)" }}
                              />
                              <span className="font-[family-name:var(--font-heading)] text-[12px] font-semibold text-on-surface truncate">
                                {boardGroup.boardName}
                              </span>
                            </div>
                            <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline px-1.5 py-0.2 rounded bg-surface border border-outline-variant/40 shrink-0">
                              {boardGroup.items.length} {boardGroup.items.length === 1 ? "recommendation" : "recommendations"}
                            </span>
                          </div>

                          {/* Matching task recommendations under this board */}
                          <div className="divide-y divide-outline-variant/15 p-1">
                            {boardGroup.items.map((item) => {
                              const isSelected = selectedItem?.id === item.id;
                              const task = item.task;
                              const priorityCfg = task.priority ? PRIORITY_BADGES[task.priority] : null;

                              return (
                                <button
                                  key={item.id}
                                  data-selected={isSelected ? "true" : "false"}
                                  onClick={() => handleSelect(item)}
                                  onMouseEnter={() => {
                                    const idx = selectableItems.findIndex((it) => it.id === item.id);
                                    if (idx !== -1) setSelectedIndex(idx);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer w-full group",
                                    isSelected
                                      ? "bg-primary/10 text-on-surface"
                                      : "hover:bg-surface-low/70 text-on-surface"
                                  )}
                                >
                                  <div className="w-4.5 h-4.5 rounded bg-surface-container flex items-center justify-center shrink-0">
                                    <Circle size={9} className="text-outline" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-[family-name:var(--font-mono)] text-[10px] font-semibold text-outline px-1.5 py-0.2 rounded bg-surface-low border border-outline-variant/40 shrink-0">
                                        {task.shortCode}
                                      </span>
                                      <p className="font-[family-name:var(--font-body)] text-[13px] font-medium truncate leading-tight">
                                        {task.title}
                                      </p>
                                    </div>
                                    {task.description && (
                                      <p className="font-[family-name:var(--font-body)] text-[11px] text-outline truncate mt-0.5">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {priorityCfg && (
                                      <span
                                        className={cn(
                                          "font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-0.2 rounded border",
                                          priorityCfg.color
                                        )}
                                      >
                                        {priorityCfg.label}
                                      </span>
                                    )}
                                    <ArrowRight
                                      size={13}
                                      className={cn(
                                        "text-outline transition-opacity shrink-0",
                                        isSelected ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-60"
                                      )}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Actions Group (Visible in "all" tab) ── */}
                  {activeTab === "all" && (isQueryEmpty ? defaultActions : matchedActions).length > 0 && (
                    <div>
                      <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-outline uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5">
                        <Sparkles size={12} />
                        <span>Quick Actions</span>
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {(isQueryEmpty ? defaultActions : matchedActions).map((item) => {
                          const isSelected = selectedItem?.id === item.id;
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              data-selected={isSelected ? "true" : "false"}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => {
                                const idx = selectableItems.findIndex((it) => it.id === item.id);
                                if (idx !== -1) setSelectedIndex(idx);
                              }}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer w-full group",
                                isSelected
                                  ? "bg-primary/10 text-on-surface"
                                  : "hover:bg-surface-low/70 text-on-surface"
                              )}
                            >
                              <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-primary">
                                <Icon size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-[family-name:var(--font-body)] text-[13px] font-semibold truncate leading-tight">
                                  {item.title}
                                </p>
                                {item.subtitle && (
                                  <p className="font-[family-name:var(--font-body)] text-[11.5px] text-on-surface-variant truncate mt-0.5">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                              <kbd className="hidden sm:inline-flex font-[family-name:var(--font-mono)] text-[10px] text-outline opacity-70">
                                ↵ Select
                              </kbd>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer keyboard guide ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-outline-variant/30 bg-surface-low/40 text-outline font-[family-name:var(--font-mono)] text-[10.5px]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-outline-variant bg-surface">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded border border-outline-variant bg-surface">↓</kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-outline-variant bg-surface">Tab</kbd>
                  <span>tabs</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-outline-variant bg-surface">↵</kbd>
                  <span>select</span>
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-outline-variant bg-surface">esc</kbd>
                <span>close</span>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
