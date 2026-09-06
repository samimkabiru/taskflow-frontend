"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  X, Search, Users, Crown, Shield, User, Eye,
  UserPlus, Settings, Check, ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBoardMembers, getBoard } from "@/services/boardService";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import type { BoardRole, BoardMember, Board } from "@/lib/types";

interface BoardMembersModalProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
  onOpenInvite?: () => void;
}

const ROLE_BADGES: Record<
  BoardRole,
  { label: string; icon: React.ElementType; badgeClass: string; iconClass: string }
> = {
  OWNER: {
    label: "Owner",
    icon: Crown,
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    iconClass: "text-amber-500",
  },
  ADMIN: {
    label: "Admin",
    icon: Shield,
    badgeClass: "bg-tertiary/10 text-tertiary border-tertiary/25",
    iconClass: "text-tertiary",
  },
  MEMBER: {
    label: "Member",
    icon: User,
    badgeClass: "bg-primary/10 text-primary border-primary/25",
    iconClass: "text-primary",
  },
  VIEWER: {
    label: "Viewer",
    icon: Eye,
    badgeClass: "bg-surface-high text-on-surface-variant border-outline-variant/40",
    iconClass: "text-outline",
  },
};

export default function BoardMembersModal({
  boardId,
  open,
  onClose,
  onOpenInvite,
}: BoardMembersModalProps) {
  const { user, getUserBoardRole } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [rawMembers, setRawMembers] = useState<BoardMember[]>([]);

  useEffect(() => {
    if (open && boardId) {
      getBoard(boardId).then(setBoard).catch(() => {});
      getBoardMembers(boardId).then(setRawMembers).catch(() => {});
    }
  }, [open, boardId]);

  const isOwner = (user && board && (board.ownerId === user.id || board.ownerId === user.email)) || getUserBoardRole(boardId) === "OWNER";
  const currentUserRole = isOwner ? "OWNER" : (getUserBoardRole(boardId) ?? "MEMBER");
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | BoardRole>("ALL");

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawMembers.filter((m) => {
      const matchesSearch =
        !q ||
        m.user.fullName.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [rawMembers, searchQuery, roleFilter]);

  const counts = useMemo(() => {
    return {
      all: rawMembers.length,
      owner: rawMembers.filter((m) => m.role === "OWNER").length,
      admin: rawMembers.filter((m) => m.role === "ADMIN").length,
      member: rawMembers.filter((m) => m.role === "MEMBER").length,
      viewer: rawMembers.filter((m) => m.role === "VIEWER").length,
    };
  }, [rawMembers]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="bg-surface-lowest border-outline-variant/60 rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl">
        <AnimatePresence mode="popLayout">
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex flex-col max-h-[85vh]"
            >
              {/* ─── Header ────────────────────────────────────────── */}
              <div className="px-6 pt-5 pb-4 border-b border-outline-variant/30 flex items-center justify-between shrink-0 bg-surface/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                    <Users size={17} />
                  </div>
                  <div>
                    <DialogTitle className="font-[family-name:var(--font-heading)] text-[17px] font-bold text-on-surface flex items-center gap-2">
                      <span>Board Members</span>
                      <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/40">
                        {rawMembers.length}
                      </span>
                    </DialogTitle>
                    <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant truncate max-w-[320px]">
                      {board ? board.name : "Workspace Board"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={17} />
                </button>
              </div>

              {/* ─── Search & Role Filter Tabs ─────────────────────── */}
              <div className="p-4 border-b border-outline-variant/25 flex flex-col gap-3 shrink-0 bg-surface-low/30">
                {/* Search input */}
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-outline pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-surface-lowest border border-outline-variant/60 rounded-xl pl-9 pr-8 py-2 font-[family-name:var(--font-body)] text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 p-1 text-outline hover:text-on-surface rounded-md transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Role Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setRoleFilter("ALL")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-[family-name:var(--font-body)] text-[11.5px] font-medium transition-all shrink-0 cursor-pointer",
                      roleFilter === "ALL"
                        ? "bg-primary text-on-primary font-semibold shadow-2xs"
                        : "bg-surface-low text-on-surface-variant hover:text-on-surface hover:bg-surface-high border border-outline-variant/30"
                    )}
                  >
                    All ({counts.all})
                  </button>

                  {(counts.owner > 0 || counts.admin > 0) && (
                    <button
                      type="button"
                      onClick={() => setRoleFilter(counts.owner > 0 ? "OWNER" : "ADMIN")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-[family-name:var(--font-body)] text-[11.5px] font-medium transition-all shrink-0 cursor-pointer",
                        roleFilter === "OWNER" || roleFilter === "ADMIN"
                          ? "bg-primary text-on-primary font-semibold shadow-2xs"
                          : "bg-surface-low text-on-surface-variant hover:text-on-surface hover:bg-surface-high border border-outline-variant/30"
                      )}
                    >
                      Admins ({counts.owner + counts.admin})
                    </button>
                  )}

                  {counts.member > 0 && (
                    <button
                      type="button"
                      onClick={() => setRoleFilter("MEMBER")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-[family-name:var(--font-body)] text-[11.5px] font-medium transition-all shrink-0 cursor-pointer",
                        roleFilter === "MEMBER"
                          ? "bg-primary text-on-primary font-semibold shadow-2xs"
                          : "bg-surface-low text-on-surface-variant hover:text-on-surface hover:bg-surface-high border border-outline-variant/30"
                      )}
                    >
                      Members ({counts.member})
                    </button>
                  )}

                  {counts.viewer > 0 && (
                    <button
                      type="button"
                      onClick={() => setRoleFilter("VIEWER")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-[family-name:var(--font-body)] text-[11.5px] font-medium transition-all shrink-0 cursor-pointer",
                        roleFilter === "VIEWER"
                          ? "bg-primary text-on-primary font-semibold shadow-2xs"
                          : "bg-surface-low text-on-surface-variant hover:text-on-surface hover:bg-surface-high border border-outline-variant/30"
                      )}
                    >
                      Viewers ({counts.viewer})
                    </button>
                  )}
                </div>
              </div>

              {/* ─── Member List ───────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 min-h-[160px] max-h-[360px]">
                {filteredMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-surface-low border border-outline-variant/40 flex items-center justify-center text-outline mb-2">
                      <Search size={18} />
                    </div>
                    <p className="font-[family-name:var(--font-heading)] text-[14px] font-medium text-on-surface">
                      No members found
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant mt-0.5">
                      Try searching with a different name or role filter.
                    </p>
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelf = user?.id === member.user.id;
                    const roleConfig = ROLE_BADGES[member.role] ?? ROLE_BADGES.MEMBER;
                    const RoleIcon = roleConfig.icon;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-low/50 hover:bg-surface-low border border-outline-variant/30 transition-colors"
                      >
                        {/* Avatar & User Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            userId={member.user.id || member.userId}
                            fullName={member.user.fullName}
                            avatarUrl={member.user.avatarUrl}
                            size={36}
                            rounded="full"
                            className="shrink-0 border-outline-variant/50"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-[family-name:var(--font-body)] text-[13.5px] font-semibold text-on-surface truncate">
                                {member.user.fullName}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded-full font-[family-name:var(--font-mono)] text-[9.5px] font-bold bg-primary/15 text-primary border border-primary/20">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="font-[family-name:var(--font-body)] text-[11.5px] text-on-surface-variant truncate">
                              {member.user.email}
                            </p>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-[family-name:var(--font-body)] text-[11px] font-semibold border shadow-2xs",
                              roleConfig.badgeClass
                            )}
                          >
                            <RoleIcon size={12} className={roleConfig.iconClass} />
                            <span>{roleConfig.label}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ─── Footer with Role-Aware Actions ────────────────── */}
              <div className="px-5 py-3.5 border-t border-outline-variant/30 bg-surface/40 flex items-center justify-between shrink-0 gap-3">
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-outline">
                  Showing {filteredMembers.length} of {rawMembers.length} members
                </span>

                <div className="flex items-center gap-2">
                  {canManage && onOpenInvite && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenInvite();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary font-[family-name:var(--font-body)] text-[12px] font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      <UserPlus size={13} />
                      <span>Invite</span>
                    </button>
                  )}

                  {canManage && (
                    <Link
                      href={`/boards/${boardId}/settings`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-low text-on-surface hover:bg-surface-high font-[family-name:var(--font-body)] text-[12px] font-medium border border-outline-variant/40 transition-colors cursor-pointer"
                    >
                      <Settings size={13} />
                      <span>Settings</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-low hover:bg-surface-high text-on-surface font-[family-name:var(--font-body)] text-[12px] font-medium border border-outline-variant/40 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
