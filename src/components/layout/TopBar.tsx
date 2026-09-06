"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Sun, Moon, Monitor, LogOut,
  LayoutDashboard, User, ChevronRight, Check, CheckCircle2,
  HelpCircle, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getBoards } from "@/services/boardService";
import { getMyTasks } from "@/services/taskService";
import { getUnreadNotificationCount } from "@/services/notificationService";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CommandSearchModal from "@/components/search/CommandSearchModal";
import CreateBoardModal from "@/components/boards/CreateBoardModal";
import QuickTipsModal from "@/components/guide/QuickTipsModal";
import UserAvatar from "@/components/ui/UserAvatar";
import type { Board } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const { user, logout } = useAuth();
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showQuickTips, setShowQuickTips] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-prompt Quick Tips guide once for new visitors
  useEffect(() => {
    try {
      const seen = localStorage.getItem("taskflow_seen_tips_v1");
      if (!seen) {
        const timer = setTimeout(() => {
          setShowQuickTips(true);
        }, 900);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [myTasksCount, setMyTasksCount] = useState(0);

  const refreshUnread = useCallback(() => {
    getUnreadNotificationCount().then(setUnreadCount).catch(() => {});
  }, []);

  const refreshBoards = useCallback(() => {
    getBoards().then(setAllBoards).catch(() => {});
    if (user) {
      getMyTasks().then(tasks => setMyTasksCount(tasks.length)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    refreshUnread();
    refreshBoards();

    const interval = setInterval(refreshUnread, 20000);
    window.addEventListener("notifications-updated", refreshUnread);
    window.addEventListener("boards-updated", refreshBoards);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-updated", refreshUnread);
      window.removeEventListener("boards-updated", refreshBoards);
    };
  }, [refreshUnread, refreshBoards, showNotifications]);

  // When profile dropdown opens, eagerly re-fetch fresh boards and stats so it's always up to date
  useEffect(() => {
    if (profileOpen) {
      refreshBoards();
      refreshUnread();
    }
  }, [profileOpen, refreshBoards, refreshUnread]);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const recentBoards = allBoards.slice(0, 3);

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <header className="bg-surface/85 backdrop-blur-xl w-full h-15 border-b border-outline-variant/40 flex justify-between items-center px-4 md:px-6 shrink-0 z-20 transition-all">

        {/* Left: Brand (mobile) + Command Search Input Trigger (desktop) */}
        <div className="flex items-center gap-4 flex-1">
          {/* Brand Emblem (visible on mobile where sidebar is hidden) */}
          <div className="md:hidden flex items-center">
            <Link href="/boards" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-primary-container to-secondary/80 flex items-center justify-center text-on-primary font-[family-name:var(--font-heading)] font-bold text-xs shrink-0 shadow-xs group-hover:scale-105 transition-all">
                <CheckCircle2 size={18} strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-[family-name:var(--font-heading)] text-[16.5px] font-bold text-on-surface tracking-tight">
                  TaskFlow
                </h1>
                <span className="font-[family-name:var(--font-mono)] text-[9px] font-semibold text-outline px-1.5 py-0.2 rounded bg-surface-low border border-outline-variant/40 uppercase tracking-wider">
                  Pro
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="relative w-full group text-left cursor-pointer"
              aria-label="Open command palette search (⌘K)"
            >
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline group-hover:text-primary transition-colors" />
              <div className="w-full h-9.5 pl-10 pr-2.5 rounded-xl bg-surface-low/80 border border-outline-variant/60 flex items-center text-on-surface-variant font-[family-name:var(--font-body)] text-[13px] group-hover:border-primary/40 group-hover:bg-surface-high/60 group-hover:text-on-surface transition-all shadow-2xs">
                <span className="text-on-surface-variant/80 group-hover:text-on-surface">Search tasks, boards, commands…</span>
                <div className="ml-auto flex items-center gap-1">
                  <kbd className="font-[family-name:var(--font-mono)] text-[10px] font-medium px-1.5 py-0.5 rounded border border-outline-variant/60 bg-surface/80 text-outline shadow-2xs">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-high rounded-xl transition-all relative cursor-pointer",
              showNotifications && "bg-surface-high text-on-surface"
            )}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-error text-white font-[family-name:var(--font-mono)] text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-surface shadow-xs pointer-events-none leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Quick Tips & Guide Button */}
          <button
            onClick={() => setShowQuickTips(true)}
            className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-high rounded-xl transition-all cursor-pointer relative group"
            aria-label="Quick Tips & Guide"
            title="Quick Tips & Guide"
          >
            <HelpCircle size={18} />
          </button>

          {/* ── Profile dropdown ───────────────────────────────── */}
          <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
            <DropdownMenuTrigger
              className="rounded-xl border border-outline-variant/80 hover:border-primary/60 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer shrink-0 shadow-2xs outline-none"
              aria-label="User menu"
            >
              <UserAvatar
                userId={user?.id}
                fullName={user?.fullName}
                avatarUrl={user?.avatarUrl}
                cacheBuster={user?.avatarUpdatedAt}
                size="md"
                rounded="xl"
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-[280px] max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar rounded-xl border border-outline-variant/50 shadow-xl p-0 bg-surface"
            >
              {/* ── User header ─────────────────────────────── */}
              <div className="relative px-4 pt-4 pb-3.5 bg-gradient-to-br from-primary/8 via-surface to-secondary/5 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    userId={user?.id}
                    fullName={user?.fullName}
                    avatarUrl={user?.avatarUrl}
                    cacheBuster={user?.avatarUpdatedAt}
                    size="lg"
                    rounded="xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-heading)] text-[14.5px] font-semibold text-on-surface truncate leading-tight">
                      {user?.fullName}
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant mt-0.5 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                {/* Quick stats */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/20">
                  <div className="flex-1 text-center">
                    <p className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-on-surface">{allBoards.length}</p>
                    <p className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline uppercase tracking-wider">Boards</p>
                  </div>
                  <div className="w-px h-6 bg-outline-variant/25" />
                  <div className="flex-1 text-center">
                    <p className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-on-surface">{unreadCount}</p>
                    <p className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline uppercase tracking-wider">Unread</p>
                  </div>
                  <div className="w-px h-6 bg-outline-variant/25" />
                  <div className="flex-1 text-center">
                    <p className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-on-surface">{myTasksCount}</p>
                    <p className="font-[family-name:var(--font-mono)] text-[9.5px] text-outline uppercase tracking-wider">Tasks</p>
                  </div>
                </div>
              </div>

              {/* ── Navigation links ─────────────────────────── */}
              <div className="p-1.5">
                <p className="font-[family-name:var(--font-mono)] text-[9.5px] font-semibold text-outline uppercase tracking-wider px-2 py-1">
                  Navigate
                </p>
                {[
                  { icon: LayoutDashboard, label: "My Boards",       href: "/boards" },
                  { icon: User,            label: "Profile & Settings", href: "/settings" },
                ].map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-black/6 dark:hover:bg-white/10 transition-colors group text-[13px] font-medium"
                  >
                    <item.icon size={15} className="shrink-0 text-outline group-hover:text-on-surface" />
                    <span className="font-[family-name:var(--font-body)] flex-1">{item.label}</span>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setShowQuickTips(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-black/6 dark:hover:bg-white/10 transition-colors group text-[13px] font-medium text-left cursor-pointer"
                >
                  <Sparkles size={15} className="shrink-0 text-primary group-hover:text-primary" />
                  <span className="font-[family-name:var(--font-body)] flex-1">Quick Tips & Guide</span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-[family-name:var(--font-mono)] bg-primary/12 text-primary font-semibold">
                    Tips
                  </span>
                </button>
              </div>

              {/* ── Recent boards ────────────────────────────── */}
              {recentBoards.length > 0 && (
                <>
                  <div className="h-px bg-outline-variant/25 mx-1.5" />
                  <div className="p-1.5">
                    <p className="font-[family-name:var(--font-mono)] text-[9.5px] font-semibold text-outline uppercase tracking-wider px-2 py-1">
                      Recent Boards
                    </p>
                    {recentBoards.map(board => (
                      <Link
                        key={board.id}
                        href={`/boards/${board.id}`}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-black/6 dark:hover:bg-white/10 transition-colors group text-[13px] font-medium"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: board.accentColor || "var(--color-primary)" }}
                        />
                        <span className="font-[family-name:var(--font-body)] flex-1 truncate">
                          {board.name}
                        </span>
                        <ChevronRight size={13} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {/* ── Appearance Submenu ───────────────────────── */}
              <div className="h-px bg-outline-variant/25 mx-1.5" />
              <div className="p-1.5">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-on-surface hover:bg-black/6 dark:hover:bg-white/10 transition-colors group text-[13px] font-medium w-full">
                    {theme === "dark" ? (
                      <Moon size={15} className="shrink-0 text-outline group-hover:text-on-surface" />
                    ) : theme === "light" ? (
                      <Sun size={15} className="shrink-0 text-outline group-hover:text-on-surface" />
                    ) : (
                      <Monitor size={15} className="shrink-0 text-outline group-hover:text-on-surface" />
                    )}
                    <span className="font-[family-name:var(--font-body)] flex-1 text-left">Appearance</span>
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-outline capitalize mr-1">
                      {theme}
                    </span>
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent className="w-40 p-1.5">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const isSelected = theme === opt.value;
                      return (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => setTheme(opt.value as "light" | "dark" | "system")}
                          className="flex items-center justify-between cursor-pointer px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={14} className={isSelected ? "text-primary" : "text-outline"} />
                            <span className={cn(isSelected && "text-primary font-semibold")}>{opt.label}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </div>

              {/* ── Sign out ─────────────────────────────────── */}
              <div className="h-px bg-outline-variant/25 mx-1.5" />
              <div className="p-1.5">
                <button
                  onClick={() => { setProfileOpen(false); setShowLogoutConfirm(true); }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-error hover:bg-error-container/20 dark:hover:bg-error-container/30 transition-colors cursor-pointer text-[13px] font-medium"
                >
                  <LogOut size={15} className="shrink-0" />
                  <span className="font-[family-name:var(--font-body)]">Sign out</span>
                </button>
              </div>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Command & Search Modal (⌘K) */}
      <CommandSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onOpenCreateBoard={() => setShowCreateBoardModal(true)}
      />

      {/* Create Board Modal */}
      <CreateBoardModal
        open={showCreateBoardModal}
        onClose={() => setShowCreateBoardModal(false)}
      />

      {/* Notifications Panel */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* Sign Out Confirmation */}
      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Sign out"
        description="You'll be signed out of this device and need to sign in again."
        confirmText="Sign out"
        variant="destructive"
      />

      {/* Quick Tips & Guide Modal */}
      <QuickTipsModal
        open={showQuickTips}
        onClose={() => setShowQuickTips(false)}
      />
    </>
  );
}
