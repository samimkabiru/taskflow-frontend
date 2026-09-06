"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ArrowLeft, Mail, UserMinus, Search,
  Users, Shield, ShieldCheck, User, Eye, Crown,
  UserPlus, Check, RefreshCw, X, AlertCircle,
  HelpCircle, LayoutDashboard, ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import NotFoundState from "@/components/ui/NotFoundState";
import {
  getBoard,
  getBoardMembers,
  getPendingInvites,
  inviteMember,
  updateMemberRole,
  removeMember,
  revokePendingInvite,
} from "@/services/boardService";
import { useAuth } from "@/contexts/AuthContext";
import { useBoardWebSocket } from "@/hooks/useBoardWebSocket";
import { hasPermission, type BoardRole, type BoardMember, type PendingInvite, type Board } from "@/lib/types";
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

const ROLES: { role: BoardRole; label: string; desc: string; icon: React.ComponentType<{ size: number; className?: string }> }[] = [
  { role: "ADMIN",  label: "Admin",  desc: "Can invite members and edit board settings", icon: Shield },
  { role: "MEMBER", label: "Member", desc: "Can create, edit, and move tasks",           icon: User },
  { role: "VIEWER", label: "Viewer", desc: "Read-only access to boards and tasks",       icon: Eye },
];

function getRoleBadge(role: BoardRole) {
  switch (role) {
    case "OWNER":
      return {
        label: "Owner",
        icon: Crown,
        classes: "bg-primary/10 text-primary border-primary/25",
      };
    case "ADMIN":
      return {
        label: "Admin",
        icon: ShieldCheck,
        classes: "bg-tertiary/10 text-tertiary border-tertiary/25",
      };
    case "MEMBER":
      return {
        label: "Member",
        icon: User,
        classes: "bg-secondary/10 text-secondary border-secondary/25",
      };
    case "VIEWER":
    default:
      return {
        label: "Viewer",
        icon: Eye,
        classes: "bg-surface-high text-on-surface-variant border-outline-variant/50",
      };
  }
}

function formatRelative(dateStr: string) {
  const diffMs  = Date.now() - new Date(dateStr).getTime();
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDay < 1)  return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

export default function BoardSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const { getUserBoardRole, user, setUserBoardRole } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; userId: string; name: string } | null>(null);
  const [selfDemoteConfirm, setSelfDemoteConfirm] = useState<{ userId: string; newRole: BoardRole } | null>(null);
  const [membersList, setMembersList] = useState<BoardMember[]>([]);
  const [pendingList, setPendingList] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Role filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BoardRole>("MEMBER");

  const refreshData = async () => {
    try {
      const [b, members, invites] = await Promise.all([
        getBoard(boardId),
        getBoardMembers(boardId),
        getPendingInvites(boardId),
      ]);
      setBoard(b);
      setMembersList(members);
      setPendingList(invites);

      const isOwner = user && (b.ownerId === user.id || b.ownerId === user.email);
      const myMembership = members.find(m => m.userId === user?.id || m.user?.email === user?.email);
      if (isOwner) {
        setUserBoardRole(boardId, "OWNER");
      } else if (myMembership) {
        setUserBoardRole(boardId, myMembership.role);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (boardId) {
      refreshData();
    }
  }, [boardId, user?.id, user?.email, setUserBoardRole]);

  // Connect STOMP WebSocket for real-time live synchronization (§6)
  useBoardWebSocket(boardId, {
    onMemberAdded: (member) => {
      setMembersList((prev) => (prev.some((m) => m.id === member.id) ? prev : [...prev, member]));
    },
    onMemberRoleChanged: (member) => {
      setMembersList((prev) => prev.map((m) => (m.userId === member.userId ? member : m)));
      if (user && (member.userId === user.id || member.user?.email === user.email)) {
        setUserBoardRole(boardId, member.role);
        if (!hasPermission(member.role, "MANAGE_MEMBERS")) {
          toast.info("Your board role was changed. Redirecting to board...");
          router.push(`/boards/${boardId}`);
        }
      }
    },
    onMemberRemoved: (userId) => {
      setMembersList((prev) => prev.filter((m) => m.userId !== userId));
      if (user && userId === user.id) {
        toast.error("You were removed from this board.");
        router.push("/boards");
      }
    },
    onMemberInvited: (invite) => {
      setPendingList((prev) => (prev.some((p) => p.id === invite.id) ? prev : [...prev, {
        id: invite.id,
        boardId: invite.boardId,
        email: invite.email,
        role: (invite.role as BoardRole) || "MEMBER",
        invitedAt: invite.createdAt,
        invitedBy: "Admin",
      }]));
    },
  });

  const isOwner = (user && board && (board.ownerId === user.id || board.ownerId === user.email)) || getUserBoardRole(boardId) === "OWNER";
  const role = isOwner ? "OWNER" : (getUserBoardRole(boardId) ?? "MEMBER");
  const canManage = role ? hasPermission(role, "MANAGE_MEMBERS") : false;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    // Check if already a member or already invited
    if (membersList.some(m => m.user.email.toLowerCase() === email)) {
      toast.error("User is already a member of this board");
      return;
    }
    if (pendingList.some(p => p.email.toLowerCase() === email)) {
      toast.error("An invite has already been sent to this email");
      return;
    }

    try {
      const invite = await inviteMember(boardId, { email, role: inviteRole });
      setPendingList(prev => (prev.some(p => p.id === invite.id) ? prev : [...prev, invite]));
      setInviteEmail("");
      toast.success(`Invitation sent to ${email}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(msg);
    }
  };

  const handleRoleChange = async (userId: string, newRole: BoardRole) => {
    const isSelf =
      user &&
      (userId === user.id ||
        membersList.find((m) => m.userId === userId)?.user?.email === user.email);

    // If an admin/manager demotes themselves to a lesser role, confirm first
    if (isSelf && (newRole === "MEMBER" || newRole === "VIEWER")) {
      setSelfDemoteConfirm({ userId, newRole });
      return;
    }

    try {
      const updated = await updateMemberRole(boardId, userId, newRole);
      setMembersList((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
      toast.success("Member role updated");
    } catch {
      toast.error("Failed to update member role");
    }
  };

  const handleConfirmSelfDemote = async () => {
    if (!selfDemoteConfirm) return;
    const { userId, newRole } = selfDemoteConfirm;
    setSelfDemoteConfirm(null);

    try {
      const updated = await updateMemberRole(boardId, userId, newRole);
      setMembersList((prev) => prev.map((m) => (m.userId === userId ? updated : m)));
      setUserBoardRole(boardId, newRole);
      const roleLabel = newRole === "VIEWER" ? "Viewer" : "Member";
      toast.info(`Your role has been changed to ${roleLabel}. Redirecting to board...`);
      router.push(`/boards/${boardId}`);
    } catch {
      toast.error("Failed to update your role");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await revokePendingInvite(inviteId);
      setPendingList(prev => prev.filter(p => p.id !== inviteId));
      toast.success("Invitation cancelled");
    } catch {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMember(boardId, memberToRemove.userId);
      setMembersList(prev => prev.filter(m => m.userId !== memberToRemove.userId));
      toast.success(`Removed ${memberToRemove.name}`);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setMemberToRemove(null);
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return membersList.filter(m => {
      const matchQuery = !q || m.user.fullName.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "ALL" || m.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [membersList, searchQuery, roleFilter]);

  if (!board) {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      );
    }
    return (
      <NotFoundState
        type="settings"
        title="Settings Unavailable"
        description="The board you're trying to configure doesn't exist, may have been deleted, or you lack administrative permissions."
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

  // Access control: only users with permission to manage settings/members can view settings
  if (!loading && !canManage) {
    return (
      <NotFoundState
        type="settings"
        title="Access Restricted"
        description="You do not have administrator permissions to manage settings for this board. Only board owners and administrators can configure member roles and board options."
        resourceId={boardId}
        primaryAction={{
          label: "Back to Board",
          href: `/boards/${boardId}`,
          icon: ArrowLeft,
        }}
        secondaryAction={{
          label: "View All Boards",
          href: "/boards",
          icon: LayoutDashboard,
        }}
      />
    );
  }

  const adminCount = membersList.filter(m => m.role === "OWNER" || m.role === "ADMIN").length;
  const capacityPct = Math.min(100, Math.round((membersList.length / 50) * 100));

  return (
    <div className="p-[var(--spacing-margin-mobile)] md:p-[var(--spacing-margin-desktop)] overflow-y-auto flex-1 h-full">
      <div className="max-w-4xl mx-auto space-y-7">

        {/* ─── Breadcrumb & Top Bar ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-outline font-[family-name:var(--font-mono)] text-[11px] mb-2">
              <Link href="/boards" className="hover:text-primary transition-colors">Boards</Link>
              <ChevronRight size={12} />
              <Link href={`/boards/${boardId}`} className="hover:text-primary transition-colors">{board.name}</Link>
              <ChevronRight size={12} />
              <span className="text-on-surface font-semibold">Members</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: board.accentColor || "var(--color-primary)" }}
              />
              <h1 className="font-[family-name:var(--font-heading)] text-[26px] md:text-[30px] font-bold text-on-surface tracking-tight">
                {board.name} Members
              </h1>
            </div>
            <p className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant mt-1">
              Manage workspace collaborators, access roles, and pending invitations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/boards/${boardId}`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-[family-name:var(--font-body)] text-[13px] font-semibold hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft size={15} />
              <span>Back to Board</span>
            </Link>
          </div>
        </div>

        {/* ─── Metrics Strip ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Active Members & Capacity */}
          <div className="bg-surface-low/50 dark:bg-surface-lowest/50 rounded-2xl border border-outline-variant/40 p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-outline font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider">
              <span>Members Capacity</span>
              <Users size={14} />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-[family-name:var(--font-heading)] text-[24px] font-bold text-on-surface">
                  {membersList.length}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[13px] text-outline">
                  / 50 max
                </span>
              </div>
              <div className="w-full bg-outline-variant/25 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Admins Count */}
          <div className="bg-surface-low/50 dark:bg-surface-lowest/50 rounded-2xl border border-outline-variant/40 p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-outline font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider">
              <span>Administrators</span>
              <ShieldCheck size={14} className="text-tertiary" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-[family-name:var(--font-heading)] text-[24px] font-bold text-on-surface">
                  {adminCount}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[12px] text-outline">
                  admins & owner
                </span>
              </div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-outline mt-2">
                Have full management privileges
              </p>
            </div>
          </div>

          {/* Pending Invites */}
          <div className="bg-surface-low/50 dark:bg-surface-lowest/50 rounded-2xl border border-outline-variant/40 p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-outline font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider">
              <span>Pending Invites</span>
              <Mail size={14} className="text-secondary" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-[family-name:var(--font-heading)] text-[24px] font-bold text-on-surface">
                  {pendingList.length}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[12px] text-outline">
                  awaiting response
                </span>
              </div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-outline mt-2">
                Invited collaborators
              </p>
            </div>
          </div>
        </div>

        {/* ─── Streamlined Invite Bar (Admins only) ─────────────── */}
        {canManage && (
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/40 p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <UserPlus size={15} />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-on-surface leading-tight">
                    Invite Collaborator
                  </h3>
                  <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant">
                    Send an invitation to join this board with a specified access role.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-1.5 mt-1">
              <div className="flex-1 relative flex items-center bg-surface-low border border-outline-variant/50 rounded-lg focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <Mail size={14} className="absolute left-2.5 text-outline pointer-events-none" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full bg-transparent border-none py-1.5 pl-8 pr-2 font-[family-name:var(--font-body)] text-[12.5px] text-on-surface placeholder:text-outline focus:outline-none h-7.5"
                  required
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Select value={inviteRole} onValueChange={v => setInviteRole(v as BoardRole)}>
                  <SelectTrigger className="w-full sm:w-28 bg-surface-low border border-outline-variant/50 text-on-surface font-medium text-[11.5px] h-7.5 rounded-lg shadow-none gap-1 px-2.5 hover:bg-surface-high transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="w-52 p-1 bg-surface">
                    {ROLES.map(r => (
                      <SelectItem key={r.role} value={r.role} className="py-1.5 px-2 rounded-md cursor-pointer">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-md bg-surface-high flex items-center justify-center shrink-0 mt-0.5">
                            <r.icon size={11} className="text-outline" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-[family-name:var(--font-body)] text-[12px] font-semibold text-on-surface leading-tight">
                              {r.label}
                            </p>
                            <p className="font-[family-name:var(--font-body)] text-[10.5px] text-on-surface-variant leading-snug mt-0.5">
                              {r.desc}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  type="submit"
                  className="bg-primary text-on-primary font-[family-name:var(--font-body)] text-[12px] font-semibold h-7.5 px-3.5 rounded-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Active Members Directory ────────────────────────── */}
        <div className="bg-surface-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden flex flex-col">
          {/* Header with Search & Filter Pills */}
          <div className="p-4 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-low/30">
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-heading)] text-[16px] font-semibold text-on-surface">
                Active Members
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-surface-container font-[family-name:var(--font-mono)] text-[10px] text-on-surface-variant font-semibold">
                {filteredMembers.length}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Filter */}
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter members..."
                  className="w-full bg-surface border border-outline-variant/60 rounded-xl py-1.5 pl-8 pr-3 font-[family-name:var(--font-body)] text-[12.5px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Role filter chips */}
              <div className="hidden sm:flex items-center bg-surface-low border border-outline-variant/40 rounded-xl p-0.5 gap-0.5">
                {(["ALL", "ADMIN", "MEMBER", "VIEWER"] as const).map(rf => (
                  <button
                    key={rf}
                    onClick={() => setRoleFilter(rf)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer",
                      roleFilter === rf
                        ? "bg-primary text-on-primary font-semibold shadow-2xs"
                        : "text-outline hover:text-on-surface"
                    )}
                  >
                    {rf === "ALL" ? "All" : rf.charAt(0) + rf.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Members Rows */}
          <div className="divide-y divide-outline-variant/20">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-outline font-[family-name:var(--font-body)] text-[13.5px]">
                No members found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredMembers.map(member => {
                const isOwner = member.role === "OWNER";
                const roleBadge = getRoleBadge(member.role);
                const BadgeIcon = roleBadge.icon;

                return (
                  <div
                    key={member.id}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-low/40 transition-colors group"
                  >
                    {/* Left: Avatar + Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <UserAvatar
                        userId={member.user.id || member.userId}
                        fullName={member.user.fullName}
                        avatarUrl={member.user.avatarUrl}
                        size={40}
                        rounded="full"
                        className="shrink-0 border-outline-variant/50 shadow-2xs"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-[family-name:var(--font-heading)] text-[14.5px] font-semibold text-on-surface truncate">
                            {member.user.fullName}
                          </p>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-[family-name:var(--font-mono)] font-semibold border shadow-2xs", roleBadge.classes)}>
                            <BadgeIcon size={11} />
                            <span>{roleBadge.label}</span>
                          </span>
                        </div>
                        <p className="font-[family-name:var(--font-mono)] text-[11.5px] text-outline truncate mt-0.5">
                          {member.user.email} · Joined {formatRelative(member.joinedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Role Modifier / Actions */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {canManage && !isOwner ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={newVal => handleRoleChange(member.userId, newVal as BoardRole)}
                          >
                            <SelectTrigger className="h-6.5 w-auto min-w-[84px] text-[11px] bg-surface-low/90 hover:bg-surface-high border border-outline-variant/40 text-on-surface font-medium rounded-md px-2 shadow-none gap-1 transition-all">
                              <BadgeIcon size={11} className={cn("shrink-0", member.role === "ADMIN" ? "text-tertiary" : member.role === "MEMBER" ? "text-primary" : "text-outline")} />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end" className="w-50 p-1 bg-surface">
                              {ROLES.map(r => (
                                <SelectItem key={r.role} value={r.role} className="py-1.5 px-2 rounded-md cursor-pointer">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <div className="w-5 h-5 rounded-md bg-surface-high flex items-center justify-center shrink-0 mt-0.5">
                                      <r.icon size={11} className="text-outline" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-[family-name:var(--font-body)] text-[11.5px] font-semibold text-on-surface leading-tight">
                                        {r.label}
                                      </p>
                                      <p className="font-[family-name:var(--font-body)] text-[10px] text-on-surface-variant leading-snug mt-0.5">
                                        {r.desc}
                                      </p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <SimpleTooltip content="Remove from board">
                            <button
                              onClick={() => setMemberToRemove({ id: member.id, userId: member.userId, name: member.user.fullName })}
                              className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                              aria-label="Remove member"
                            >
                              <UserMinus size={15} />
                            </button>
                          </SimpleTooltip>
                        </>
                      ) : (
                        <span className="font-[family-name:var(--font-mono)] text-[11px] text-outline">
                          {isOwner ? "Workspace Owner" : member.role.toLowerCase()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Pending Invites Section ─────────────────────────── */}
        {pendingList.length > 0 && (
          <div className="bg-surface-lowest rounded-2xl border border-outline-variant/40 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-outline-variant/30 bg-surface-low/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-secondary" />
                <h3 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-on-surface">
                  Pending Invitations ({pendingList.length})
                </h3>
              </div>
            </div>

            <div className="divide-y divide-outline-variant/20">
              <AnimatePresence>
                {pendingList.map(invite => (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.16 }}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-low/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline shrink-0">
                        <Mail size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-[family-name:var(--font-body)] text-[13.5px] text-on-surface font-medium">
                            {invite.email}
                          </p>
                          <span className="px-2 py-0.5 rounded-md bg-surface-low text-on-surface-variant font-[family-name:var(--font-mono)] text-[10px] uppercase font-semibold border border-outline-variant/40">
                            {invite.role}
                          </span>
                        </div>
                        <p className="font-[family-name:var(--font-mono)] text-[11px] text-outline mt-0.5">
                          Invited {new Date(invite.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toast.success(`Invitation resent to ${invite.email}`)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-primary hover:bg-primary/10 font-[family-name:var(--font-body)] text-[12px] font-medium transition-colors cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          <span>Resend</span>
                        </button>
                        <SimpleTooltip content="Revoke invitation">
                          <button
                            onClick={() => handleCancelInvite(invite.id)}
                            className="p-1 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                            aria-label="Revoke invitation"
                          >
                            <X size={14} />
                          </button>
                        </SimpleTooltip>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ─── Permission Roles Cheat Sheet ────────────────────── */}
        <div className="bg-surface-low/40 dark:bg-surface-lowest/40 rounded-2xl border border-outline-variant/30 p-4.5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-on-surface font-[family-name:var(--font-heading)] text-[13.5px] font-semibold">
            <HelpCircle size={15} className="text-primary" />
            <span>Role Permissions Reference</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface border border-outline-variant/30 shadow-2xs">
              <span className="font-[family-name:var(--font-heading)] text-[12.5px] font-bold text-tertiary flex items-center gap-1.5">
                <ShieldCheck size={13} /> Admin
              </span>
              <p className="font-[family-name:var(--font-body)] text-[11.5px] text-on-surface-variant leading-relaxed">
                Can manage board settings, invite or remove members, and adjust member roles.
              </p>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface border border-outline-variant/30 shadow-2xs">
              <span className="font-[family-name:var(--font-heading)] text-[12.5px] font-bold text-secondary flex items-center gap-1.5">
                <User size={13} /> Member
              </span>
              <p className="font-[family-name:var(--font-body)] text-[11.5px] text-on-surface-variant leading-relaxed">
                Can create, edit, move, and comment on tasks across all task lists.
              </p>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface border border-outline-variant/30 shadow-2xs">
              <span className="font-[family-name:var(--font-heading)] text-[12.5px] font-bold text-outline flex items-center gap-1.5">
                <Eye size={13} /> Viewer
              </span>
              <p className="font-[family-name:var(--font-body)] text-[11.5px] text-on-surface-variant leading-relaxed">
                Read-only access to view boards, task lists, tasks, and activity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        description={`Are you sure you want to remove ${memberToRemove?.name} from this board? They will lose access immediately.`}
        confirmText="Remove"
        variant="destructive"
      />

      {/* Self-Demote Confirmation Dialog */}
      <ConfirmDialog
        open={!!selfDemoteConfirm}
        onClose={() => setSelfDemoteConfirm(null)}
        onConfirm={handleConfirmSelfDemote}
        title={`Change Your Role to ${selfDemoteConfirm?.newRole === "VIEWER" ? "Viewer" : "Member"}?`}
        description="You are currently an administrator. Changing your role will immediately revoke your administrative permissions, including access to this settings page. You will be redirected back to the board."
        confirmText="Change Role & Leave"
        cancelText="Keep Admin Role"
        variant="destructive"
        icon={<ShieldAlert size={15} />}
      />
    </div>
  );
}
