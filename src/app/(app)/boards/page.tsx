"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, CirclePlus, MoreVertical, Pencil,
  Trash2, Users, LayoutGrid, List, ChevronRight,
} from "lucide-react";
import { getBoards, createBoard, deleteBoard, getBoardMembers } from "@/services/boardService";
import { getTaskListsForBoard, getTasksForBoard } from "@/services/taskService";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/types";
import { cn } from "@/lib/utils";
import CreateBoardModal from "@/components/boards/CreateBoardModal";
import EditBoardModal from "@/components/boards/EditBoardModal";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { Board, BoardRole } from "@/lib/types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Helpers ──────────────────────────────────────────────────
function getRelativeTime(dateStr: string): string {
  const diffMs   = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60)  return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs  < 24)  return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

const ROLE_STYLE: Record<string, string> = {
  OWNER:  "bg-primary/10 text-primary",
  ADMIN:  "bg-tertiary/10 text-tertiary",
  MEMBER: "bg-outline-variant/40 text-on-surface-variant",
  VIEWER: "bg-outline-variant/20 text-outline",
};

function AvatarStack({ memberCount = 1 }: { memberCount?: number; members?: any[] }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-outline">
        <Users size={11} />
      </div>
      <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline">
        {memberCount}
      </span>
    </div>
  );
}

// ─── Shared board options dropdown ────────────────────────────
function BoardMenu({
  board, canEdit, canDelete, onEdit, onDelete,
}: {
  board: Board; canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  if (!canEdit) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-high/80 dark:hover:bg-white/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shrink-0"
        aria-label={`Options for ${board.name}`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <MoreVertical size={15} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(); }}>
          <Pencil size={14} /> Edit Board
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href={`/boards/${board.id}/settings`} className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
            <Users size={14} /> Members
          </Link>
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}>
              <Trash2 size={14} /> Delete Board
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function BoardsDashboard() {
  const { getUserBoardRole, user, setUserBoardRole } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard,    setEditingBoard]    = useState<Board | null>(null);
  const [boardToDelete,   setBoardToDelete]   = useState<{ id: string; name: string } | null>(null);
  const [boardsList,      setBoardsList]      = useState<Board[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");

  const refreshBoards = async () => {
    try {
      const data = await getBoards();
      setBoardsList(data);
      if (user) {
        data.forEach(b => {
          if (b.ownerId === user.id || b.ownerId === user.email) {
            setUserBoardRole(b.id, "OWNER");
          }
        });
      }

      // Compute board task metrics and member counts in parallel
      Promise.allSettled(
        data.map(async (board) => {
          const [lists, tasks, members] = await Promise.all([
            getTaskListsForBoard(board.id).catch(() => []),
            getTasksForBoard(board.id).catch(() => []),
            getBoardMembers(board.id).catch(() => []),
          ]);

          const sortedLists = [...lists].sort((a, b) => a.position - b.position);
          const doneList = sortedLists.find(l =>
            /^(done|completed?|finished?|closed?)$/i.test(l.name.trim())
          );

          const taskCount = tasks.length;
          const completedTaskCount = doneList
            ? tasks.filter(t => t.listId === doneList.id).length
            : undefined;

          // Resolve current user's role on this board
          const isOwner = user && (board.ownerId === user.id || board.ownerId === user.email);
          const myMembership = members.find(m => m.userId === user?.id || m.user?.email === user?.email);
          const resolvedRole: BoardRole = isOwner ? "OWNER" : (myMembership?.role ?? "MEMBER");

          if (user) {
            setUserBoardRole(board.id, resolvedRole);
          }

          return {
            id: board.id,
            taskCount,
            completedTaskCount,
            hasDoneList: Boolean(doneList),
            memberCount: members.length > 0 ? members.length : 1,
            currentUserRole: resolvedRole,
          };
        })
      ).then((results) => {
        const statsMap = new Map<string, {
          taskCount: number;
          completedTaskCount?: number;
          hasDoneList: boolean;
          memberCount: number;
          currentUserRole?: BoardRole;
        }>();

        results.forEach((res) => {
          if (res.status === "fulfilled") {
            statsMap.set(res.value.id, res.value);
          }
        });

        setBoardsList((prev) =>
          prev.map((b) => {
            const stats = statsMap.get(b.id);
            if (!stats) return b;
            return {
              ...b,
              taskCount: stats.taskCount,
              completedTaskCount: stats.completedTaskCount,
              hasDoneList: stats.hasDoneList,
              memberCount: stats.memberCount,
              currentUserRole: stats.currentUserRole,
            };
          })
        );
      });
    } catch {
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBoards();
  }, [user?.id, user?.email]);

  useEffect(() => {
    const handleBoardsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.source === "boards-page") return;
      refreshBoards();
    };
    window.addEventListener("boards-updated", handleBoardsUpdated);
    return () => {
      window.removeEventListener("boards-updated", handleBoardsUpdated);
    };
  }, []);

  useEffect(() => {
    if (user && boardsList.length > 0) {
      boardsList.forEach(b => {
        if (b.ownerId === user.id || b.ownerId === user.email) {
          setUserBoardRole(b.id, "OWNER");
        }
      });
    }
  }, [user, boardsList, setUserBoardRole]);

  // Persist view preference
  useEffect(() => {
    const saved = localStorage.getItem("boards-view") as "grid" | "list" | null;
    if (saved) setView(saved);
  }, []);

  const toggleView = (v: "grid" | "list") => {
    setView(v);
    localStorage.setItem("boards-view", v);
  };

  const handleCreateBoard = async (data: {
    name: string;
    description: string;
    accentColor: string;
    taskPrefix: string;
  }) => {
    const tempId = `temp-board-${Date.now()}`;
    const clientKey = `board-client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticBoard: Board = {
      id: tempId,
      name: data.name,
      description: data.description,
      accentColor: data.accentColor,
      taskPrefix: data.taskPrefix,
      ownerId: user?.id || user?.email || "current-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      taskCount: 0,
      completedTaskCount: 0,
      hasDoneList: false,
      memberCount: 1,
      currentUserRole: "OWNER",
      clientKey,
    };

    // 1. Immediately insert optimistic board at top of list
    setBoardsList((prev) => [optimisticBoard, ...prev]);

    // 2. Call API in background
    try {
      const created = await createBoard(data);
      if (user) {
        setUserBoardRole(created.id, "OWNER");
      }
      setBoardsList((prev) =>
        prev.map((b) =>
          b.id === tempId || b.clientKey === clientKey
            ? { ...created, memberCount: 1, currentUserRole: "OWNER", clientKey }
            : b
        )
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("boards-updated", { detail: { source: "boards-page" } }));
      }
      toast.success(`Board "${data.name}" created!`);
    } catch (err: unknown) {
      // Revert optimistic insertion on failure
      setBoardsList((prev) => prev.filter((b) => b.id !== tempId && b.clientKey !== clientKey));
      const errorMsg = err instanceof Error ? err.message : "Failed to create board";
      toast.error(errorMsg);
    }
  };

  const handleDeleteBoard = async (board: { id: string; name: string }) => {
    const target = board;
    const prevBoards = [...boardsList];

    // 1. Immediately dismiss dialog and optimistically remove from UI
    setBoardToDelete(null);
    setBoardsList((prev) => prev.filter((b) => b.id !== target.id));

    // 2. Perform API call in background
    try {
      await deleteBoard(target.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("boards-updated", { detail: { source: "boards-page" } }));
      }
      toast.success(`Board "${target.name}" deleted.`);
    } catch {
      // Revert on failure
      setBoardsList(prevBoards);
      toast.error(`Failed to delete board "${target.name}". Please try again.`);
    }
  };

  return (
    <div className="p-[var(--spacing-margin-mobile)] md:p-[var(--spacing-margin-desktop)] overflow-y-auto flex-1 h-full">

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-[26px] font-bold text-on-surface tracking-tight">
            Your Boards
          </h1>
          <p className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant mt-0.5">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-outline">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                Loading your boards...
              </span>
            ) : (
              `${boardsList.length} board${boardsList.length !== 1 ? "s" : ""} · Manage your projects and workflows.`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle with Custom Tooltips */}
          {boardsList.length > 0 && (
            <div className="flex items-center bg-surface-low border border-outline-variant rounded-xl p-1 gap-0.5">
              {(["grid", "list"] as const).map(v => {
                const Icon = v === "grid" ? LayoutGrid : List;
                const label = v === "grid" ? "Grid view" : "List view";
                return (
                  <SimpleTooltip key={v} content={label}>
                    <button
                      onClick={() => toggleView(v)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all cursor-pointer",
                        view === v
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      )}
                      aria-label={label}
                    >
                      <Icon size={16} />
                    </button>
                  </SimpleTooltip>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary px-4 py-2 rounded-xl font-[family-name:var(--font-body)] text-[14px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus size={16} />
            New Board
          </button>
        </div>
      </div>

      {/* ─── Loading State (Skeleton Cards) ────────────────────── */}
      {loading ? (
        <div
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[var(--spacing-gutter)] auto-rows-[200px]"
              : "flex flex-col gap-3"
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl border border-outline-variant/40 bg-surface-low/50 p-5 flex flex-col justify-between animate-pulse",
                view === "grid" ? "h-[200px]" : "h-[74px]"
              )}
            >
              {view === "grid" ? (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-surface-container" />
                      <div className="space-y-2">
                        <div className="w-28 h-4 rounded-md bg-surface-container" />
                        <div className="w-16 h-3 rounded-md bg-surface-container/70" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="w-full h-1.5 rounded-full bg-surface-container" />
                    <div className="flex justify-between items-center">
                      <div className="w-14 h-3 rounded bg-surface-container/70" />
                      <div className="w-10 h-3 rounded bg-surface-container/70" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between w-full h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-surface-container" />
                    <div className="space-y-1.5">
                      <div className="w-32 h-4 rounded-md bg-surface-container" />
                      <div className="w-20 h-3 rounded-md bg-surface-container/70" />
                    </div>
                  </div>
                  <div className="w-24 h-4 rounded-md bg-surface-container/70" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : boardsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center mb-6 shadow-xs">
            <CirclePlus size={36} className="text-outline" strokeWidth={1.5} />
          </div>
          <h2 className="font-[family-name:var(--font-heading)] text-[22px] font-semibold text-on-surface mb-2">
            No boards yet
          </h2>
          <p className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant mb-8 max-w-sm text-center leading-relaxed">
            Create your first board to start organising tasks and workflows.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary px-6 py-3 rounded-xl font-[family-name:var(--font-body)] text-[15px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus size={20} /> Create your first board
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">

          {/* ══════════════ GRID VIEW ══════════════ */}
          {view === "grid" && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[var(--spacing-gutter)] auto-rows-[200px]"
            >
              {/* Create new card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="relative h-full w-full rounded-xl border-2 border-dashed border-outline-variant hover:border-primary/40 hover:bg-primary/3 transition-all duration-200 flex flex-col items-center justify-center text-on-surface-variant hover:text-primary group bg-transparent cursor-pointer"
              >
                <CirclePlus size={30} className="mb-2 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <span className="font-[family-name:var(--font-body)] text-[13px] font-medium">New Board</span>
              </button>

              <AnimatePresence>
                {boardsList.map((board) => {
                  const isOwner = user && (board.ownerId === user.id || board.ownerId === user.email);
                  const role = isOwner ? "OWNER" : (board.currentUserRole ?? getUserBoardRole(board.id) ?? "MEMBER");
                  const memberCount = board.memberCount ?? 1;
                  const canDelete = role ? hasPermission(role, "DELETE_BOARD") : false;
                  const canEdit = role ? hasPermission(role, "MANAGE_SETTINGS") : false;
                  const hasDoneList = board.hasDoneList ?? false;
                  const pct = (board.taskCount ?? 0) > 0 && hasDoneList
                    ? Math.round(((board.completedTaskCount ?? 0) / (board.taskCount ?? 1)) * 100)
                    : 0;
                  const isPending = board.id.startsWith("temp-");

                  return (
                    <motion.div
                      key={board.clientKey || board.id}
                      layout="position"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        y: 12,
                        scale: 0.96,
                        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                      }}
                      transition={{
                        duration: 0.24,
                        ease: [0.16, 1, 0.3, 1],
                        layout: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                      }}
                      className="h-full"
                    >
                      <Link
                        href={isPending ? "#" : `/boards/${board.id}`}
                        onClick={(e) => {
                          if (isPending) e.preventDefault();
                        }}
                        className={cn(
                          "elevation-1 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group h-full transition-all duration-200",
                          isPending
                            ? "opacity-80 ring-1 ring-primary/30 pointer-events-none cursor-default"
                            : "cursor-pointer hover:shadow-md hover:scale-[1.02]"
                        )}
                      >
                        {/* Accent stripe */}
                        <div
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all",
                            isPending && "animate-pulse"
                          )}
                          style={{ backgroundColor: board.accentColor }}
                        />

                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-[family-name:var(--font-heading)] text-[17px] font-semibold text-on-surface line-clamp-1 pr-2 leading-tight flex-1">
                              {board.name}
                            </h3>
                            {isPending ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse font-[family-name:var(--font-mono)] shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                                Creating...
                              </span>
                            ) : (
                              <BoardMenu
                                board={board}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                onEdit={() => setEditingBoard(board)}
                                onDelete={() => setBoardToDelete({ id: board.id, name: board.name })}
                              />
                            )}
                          </div>
                          <p className="font-[family-name:var(--font-body)] text-[12.5px] text-on-surface-variant line-clamp-2 leading-relaxed">
                            {board.description || "No description"}
                          </p>
                        </div>

                        {/* Progress bar or Task count */}
                        {hasDoneList && (board.taskCount ?? 0) > 0 ? (
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline">{pct}% complete</span>
                              <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline">{board.completedTaskCount ?? 0}/{board.taskCount ?? 0}</span>
                            </div>
                            <div className="h-1 rounded-full bg-outline-variant/30 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/70 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (board.taskCount ?? 0) > 0 ? (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline">
                              {board.taskCount} {board.taskCount === 1 ? "task" : "tasks"}
                            </span>
                          </div>
                        ) : null}

                        <div className="flex items-end justify-between mt-3">
                          <AvatarStack memberCount={memberCount} />
                          <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline">
                            {isPending ? "Just now" : getRelativeTime(board.updatedAt)}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══════════════ LIST VIEW ══════════════ */}
          {view === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-0 rounded-xl border border-outline-variant/50 overflow-hidden bg-surface"
            >
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-2.5 border-b border-outline-variant/40 bg-surface-low/50">
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline uppercase tracking-widest">Board</span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline uppercase tracking-widest w-24 text-center">Progress</span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline uppercase tracking-widest w-20 text-center">Members</span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline uppercase tracking-widest w-16 text-center">Role</span>
                <span className="w-8" />
              </div>

              <AnimatePresence>
                {boardsList.map((board, idx) => {
                  const isOwner     = user && (board.ownerId === user.id || board.ownerId === user.email);
                  const role        = isOwner ? "OWNER" : (board.currentUserRole ?? getUserBoardRole(board.id) ?? "MEMBER");
                  const memberCount = board.memberCount ?? 1;
                  const canDelete   = role ? hasPermission(role, "DELETE_BOARD")    : false;
                  const canEdit     = role ? hasPermission(role, "MANAGE_SETTINGS") : false;
                  const hasDoneList = board.hasDoneList ?? false;
                  const pct = (board.taskCount ?? 0) > 0 && hasDoneList
                    ? Math.round(((board.completedTaskCount ?? 0) / (board.taskCount ?? 1)) * 100)
                    : 0;
                  const roleLabel = role ?? "MEMBER";
                  const isPending = board.id.startsWith("temp-");

                  return (
                    <motion.div
                      key={board.clientKey || board.id}
                      layout="position"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        y: 8,
                        transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
                      }}
                      transition={{
                        duration: 0.2,
                        ease: [0.16, 1, 0.3, 1],
                        layout: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                      }}
                      className={cn(
                        "group relative",
                        idx < boardsList.length - 1 && "border-b border-outline-variant/30",
                        isPending && "opacity-80"
                      )}
                    >
                      <Link
                        href={isPending ? "#" : `/boards/${board.id}`}
                        onClick={(e) => {
                          if (isPending) e.preventDefault();
                        }}
                        className={cn(
                          "grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 sm:gap-4 items-center px-5 py-4 transition-colors",
                          isPending ? "pointer-events-none cursor-default" : "hover:bg-surface-low/60 cursor-pointer"
                        )}
                      >
                        {/* Board name + description */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Accent dot */}
                          <div
                            className={cn("w-2.5 h-2.5 rounded-full shrink-0", isPending && "animate-pulse")}
                            style={{ backgroundColor: board.accentColor }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-[family-name:var(--font-heading)] text-[14.5px] font-semibold text-on-surface truncate leading-tight">
                                {board.name}
                              </p>
                              {isPending && (
                                <span className="flex items-center gap-1 text-[9.5px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-full animate-pulse font-[family-name:var(--font-mono)] shrink-0">
                                  Creating...
                                </span>
                              )}
                            </div>
                            <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant truncate mt-0.5">
                              {board.description || "No description"} · {isPending ? "Just now" : getRelativeTime(board.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Progress or Task count */}
                        <div className="hidden sm:flex flex-col items-center justify-center gap-1 w-24">
                          {hasDoneList && (board.taskCount ?? 0) > 0 ? (
                            <>
                              <div className="w-full h-1.5 rounded-full bg-outline-variant/25 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary/70"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline">
                                {board.completedTaskCount ?? 0}/{board.taskCount ?? 0} tasks
                              </span>
                            </>
                          ) : (
                            <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline text-center">
                              {(board.taskCount ?? 0) > 0 ? `${board.taskCount} tasks` : "—"}
                            </span>
                          )}
                        </div>

                        {/* Members */}
                        <div className="hidden sm:flex justify-center w-20">
                          <AvatarStack memberCount={memberCount} />
                        </div>

                        {/* Role pill */}
                        <div className="hidden sm:flex justify-center w-16">
                          <span className={cn(
                            "font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-md font-semibold capitalize",
                            ROLE_STYLE[roleLabel] ?? ROLE_STYLE.MEMBER
                          )}>
                            {roleLabel.charAt(0) + roleLabel.slice(1).toLowerCase()}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end w-8 gap-1" onClick={e => e.preventDefault()}>
                          {!isPending && (
                            <BoardMenu
                              board={board} canEdit={canEdit} canDelete={canDelete}
                              onEdit={() => setEditingBoard(board)}
                              onDelete={() => setBoardToDelete({ id: board.id, name: board.name })}
                            />
                          )}
                        </div>
                      </Link>

                      {/* Hover chevron (desktop) — right edge */}
                      {!isPending && (
                        <ChevronRight
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none hidden sm:block"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add board row */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-3 px-5 py-3.5 text-on-surface-variant hover:text-primary hover:bg-surface-low/60 transition-colors cursor-pointer border-t border-outline-variant/30 w-full"
              >
                <Plus size={15} className="shrink-0" />
                <span className="font-[family-name:var(--font-body)] text-[13px] font-medium">New board</span>
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* ─── Modals ──────────────────────────────────────────── */}
      <CreateBoardModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateBoard={handleCreateBoard}
      />
      {editingBoard && (
        <EditBoardModal
          board={editingBoard}
          open={!!editingBoard}
          onClose={() => { setEditingBoard(null); refreshBoards(); }}
        />
      )}
      <ConfirmDialog
        open={!!boardToDelete}
        onClose={() => setBoardToDelete(null)}
        onConfirm={() => { if (boardToDelete) handleDeleteBoard(boardToDelete); }}
        title="Delete Board"
        description={`This permanently deletes '${boardToDelete?.name}' and all its tasks. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
