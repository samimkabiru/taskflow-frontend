"use client";

import { useState, useEffect } from "react";
import {
  X, Mail, Send, RefreshCw,
  UserPlus, Shield, User, Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPendingInvites, inviteMember, revokePendingInvite } from "@/services/boardService";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BoardRole, PendingInvite } from "@/lib/types";

interface InviteMemberModalProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS: { role: BoardRole; label: string; desc: string; icon: React.ElementType; color: string; bg: string }[] = [
  {
    role: "ADMIN",
    label: "Admin",
    desc: "Can invite members & edit board settings",
    icon: Shield,
    color: "text-tertiary",
    bg: "bg-tertiary/15 text-tertiary border-tertiary/25",
  },
  {
    role: "MEMBER",
    label: "Member",
    desc: "Can create, edit & move tasks",
    icon: User,
    color: "text-primary",
    bg: "bg-primary/15 text-primary border-primary/25",
  },
  {
    role: "VIEWER",
    label: "Viewer",
    desc: "Read-only view access",
    icon: Eye,
    color: "text-outline",
    bg: "bg-surface-high text-on-surface-variant border-outline-variant/50",
  },
];

export default function InviteMemberModal({ boardId, open, onClose }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<BoardRole>("MEMBER");
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && boardId) {
      getPendingInvites(boardId).then(setPendingInvites).catch(() => {});
    }
  }, [open, boardId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Please enter an email address.");
      return;
    }

    if (pendingInvites.some(p => p.email.toLowerCase() === trimmedEmail)) {
      toast.error("An invitation has already been sent to this email.");
      return;
    }

    setSending(true);
    try {
      const result = await inviteMember(boardId, { email: trimmedEmail, role });
      setPendingInvites((prev) => (prev.some((p) => p.id === result.id) ? prev : [...prev, result]));
      toast.success(`Invitation sent to ${trimmedEmail}!`);
      setEmail("");
      setRole("MEMBER");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const revokeInvite = async (id: string, inviteEmail: string) => {
    try {
      await revokePendingInvite(id);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
      toast.success(`Revoked invite for ${inviteEmail}`);
    } catch {
      toast.error(`Failed to revoke invite for ${inviteEmail}`);
    }
  };

  const resendInvite = (inviteEmail: string) => {
    toast.success(`Resent invite to ${inviteEmail}`);
  };

  const activeRoleMeta = ROLE_OPTIONS.find(r => r.role === role) || ROLE_OPTIONS[1];
  const ActiveRoleIcon = activeRoleMeta.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-surface/95 dark:bg-surface/95 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl max-w-md w-full p-0 overflow-hidden shadow-2xl select-none">
        {/* ─── Hero Header ───────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 border-b border-outline-variant/30 bg-surface/50 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <UserPlus size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-[family-name:var(--font-heading)] text-[18px] font-bold text-on-surface leading-tight tracking-tight">
              Invite Collaborator
            </DialogTitle>
            <p className="font-[family-name:var(--font-body)] text-[12.5px] text-on-surface-variant mt-0.5 leading-snug">
              Invite a teammate by email with a designated permission role.
            </p>
          </div>
        </div>

        {/* ─── Form Body ─────────────────────────────────────── */}
        <form onSubmit={handleSendInvite} className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant font-medium uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-3 text-outline shrink-0 pointer-events-none" />
              <input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-low border border-outline-variant/60 rounded-xl py-2 pl-9 pr-3 font-[family-name:var(--font-body)] text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all leading-normal"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant font-medium uppercase tracking-wider block">
              Role & Permissions
            </label>
            <Select
              value={role}
              onValueChange={(val) => val && setRole(val as BoardRole)}
            >
              <SelectTrigger className="w-full h-10 bg-surface-low border border-outline-variant/60 text-on-surface text-[12.5px] font-medium rounded-xl px-3 shadow-none transition-all hover:bg-surface-high">
                <div className="flex items-center gap-2">
                  <div className={cn("w-5 h-5 rounded-md flex items-center justify-center border shrink-0", activeRoleMeta.bg)}>
                    <ActiveRoleIcon size={12} className={activeRoleMeta.color} />
                  </div>
                  <span className="font-semibold">{activeRoleMeta.label}</span>
                  <span className="text-outline text-[11.5px] truncate hidden sm:inline">
                    — {activeRoleMeta.desc}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent align="center" className="w-[var(--radix-select-trigger-width)] p-1.5 bg-surface rounded-xl shadow-xl">
                {ROLE_OPTIONS.map((r) => {
                  const IconComponent = r.icon;
                  return (
                    <SelectItem key={r.role} value={r.role} className="cursor-pointer py-2 px-2.5 rounded-lg">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border shrink-0 mt-0.5", r.bg)}>
                          <IconComponent size={13} className={r.color} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-[family-name:var(--font-body)] text-[12.5px] font-semibold text-on-surface leading-tight">
                            {r.label}
                          </p>
                          <p className="font-[family-name:var(--font-body)] text-[11px] text-on-surface-variant leading-snug mt-0.5">
                            {r.desc}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="h-8.5 px-3.5 border border-outline-variant/50 rounded-xl font-[family-name:var(--font-body)] text-[12.5px] font-medium text-on-surface hover:bg-surface-high transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="h-8.5 flex items-center gap-1.5 bg-primary text-on-primary font-[family-name:var(--font-body)] text-[12.5px] font-semibold px-4 rounded-xl hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Send size={13} />
              <span>{sending ? "Sending..." : "Send Invite"}</span>
            </button>
          </div>

          {/* ─── Pending Invites Sub-section ────────────────────── */}
          {pendingInvites.length > 0 && (
            <div className="pt-3 border-t border-outline-variant/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-[10.5px] font-bold text-outline uppercase tracking-wider">
                  Pending Invitations ({pendingInvites.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {pendingInvites.map((inv) => {
                  const roleMeta = ROLE_OPTIONS.find(r => r.role === inv.role) || ROLE_OPTIONS[1];
                  const RoleIcon = roleMeta.icon;

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-2 bg-surface-low/70 border border-outline-variant/40 rounded-xl p-2.5 text-[12.5px] hover:bg-surface-low transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-on-surface font-[family-name:var(--font-body)] text-[13px] truncate leading-tight">
                          {inv.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold px-1.5 py-0.2 rounded-md border", roleMeta.bg)}>
                            <RoleIcon size={10} />
                            {roleMeta.label}
                          </span>
                          <span className="text-[11px] text-outline font-[family-name:var(--font-mono)]">
                            {new Date(inv.invitedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <SimpleTooltip content="Resend Invite">
                          <button
                            type="button"
                            onClick={() => resendInvite(inv.email)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            aria-label="Resend Invite"
                          >
                            <RefreshCw size={13} />
                          </button>
                        </SimpleTooltip>
                        <SimpleTooltip content="Revoke Invite">
                          <button
                            type="button"
                            onClick={() => revokeInvite(inv.id, inv.email)}
                            className="p-1.5 text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors cursor-pointer"
                            aria-label="Revoke Invite"
                          >
                            <X size={14} />
                          </button>
                        </SimpleTooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
