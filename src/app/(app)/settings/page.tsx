"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sun, Moon, Monitor, LogOut, Lock, Check,
  User, Palette, Shield, Camera, ChevronRight,
  AlertTriangle, Eye, EyeOff, Trash2, Loader2, Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DeleteAccountDialog from "@/components/settings/DeleteAccountDialog";
import AvatarPreviewModal from "@/components/settings/AvatarPreviewModal";
import UserAvatar from "@/components/ui/UserAvatar";
import { changeUserPassword } from "@/services/authService";
import { updateUserProfile, uploadUserAvatar, getUserAvatarUrl } from "@/services/userService";
import imageCompression from "browser-image-compression";
import {
  isChatSoundEnabled,
  setChatSoundEnabled,
  playMessageSentSound,
} from "@/lib/soundEffects";

// ─── Nav config ──────────────────────────────────────────────
const NAV = [
  { id: "profile",    label: "Profile",    icon: User,    desc: "Name, avatar & email" },
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme & sound effects" },
  { id: "security",   label: "Security",   icon: Lock,    desc: "Password & sessions" },
  { id: "session",    label: "Session",    icon: Shield,  desc: "Sign out & danger zone" },
] as const;

type SectionId = typeof NAV[number]["id"];

// ─── Reusable sub-components (defined OUTSIDE the page) ──────
// Field row — label on left, control on right (GitHub style)
function FieldRow({
  label, hint, children, last = false,
}: {
  label: string; hint?: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-start gap-4 md:gap-8 py-5",
      !last && "border-b border-outline-variant/30"
    )}>
      <div className="md:w-64 shrink-0">
        <p className="font-[family-name:var(--font-body)] text-[14px] font-semibold text-on-surface">
          {label}
        </p>
        {hint && (
          <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
            {hint}
          </p>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// Toggle switch
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-10 h-[22px] rounded-full relative transition-colors duration-200 cursor-pointer shrink-0",
        on ? "bg-primary" : "bg-outline-variant/60"
      )}
    >
      <div className={cn(
        "absolute w-4 h-4 rounded-full bg-white shadow top-[3px] transition-transform duration-200",
        on ? "translate-x-5" : "translate-x-[3px]"
      )} />
    </button>
  );
}

// Text input
function TextInput({
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly = false,
  autoComplete,
  id,
  name,
}: {
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoComplete?: string;
  id?: string;
  name?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (showPw ? "text" : "password") : type;

  return (
    <div className="relative w-full">
      <input
        type={effectiveType}
        id={id}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        className={cn(
          "w-full rounded-xl px-4 py-2.5 font-[family-name:var(--font-body)] text-[14px] text-on-surface",
          "border transition-all outline-none",
          isPassword && "pr-10",
          readOnly
            ? "bg-surface-low border-outline-variant/40 text-on-surface-variant cursor-default"
            : "bg-surface-lowest border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/15"
        )}
      />
      {isPassword && !readOnly && (
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1 rounded-md transition-colors cursor-pointer"
          tabIndex={-1}
          aria-label={showPw ? "Hide password" : "Show password"}
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

// Save button
function SaveBtn({
  loading = false,
  disabled = false,
  label = "Save changes",
  onClick,
  type = "button",
  className,
}: {
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center text-center gap-2 bg-primary text-on-primary font-[family-name:var(--font-body)] text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0",
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span>Saving…</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}

// Panel wrapper
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0">
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout, updateCurrentUser, deleteAccount } = useAuth();

  const [section, setSection]     = useState<SectionId>("profile");
  const [showLogout, setShowLogout] = useState(false);

  // Profile name state
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [isSavingName, setIsSavingName] = useState(false);

  // Sync fullName when user loads or updates
  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user?.fullName]);

  // Avatar upload and preview modal state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState<number | undefined>(user?.avatarUpdatedAt);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.avatarUpdatedAt !== undefined) {
      setAvatarTimestamp(user.avatarUpdatedAt);
    }
  }, [user?.avatarUpdatedAt]);

  // Account deletion dialog state
  const [showDeleteStep1, setShowDeleteStep1] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);

  // Password state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwLoading, setPwLoading]   = useState(false);

  // Clear password inputs on mount and whenever navigating sections
  useEffect(() => {
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    const timer = setTimeout(() => {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }, 80);
    return () => clearTimeout(timer);
  }, [section]);

  // Chat sound effects state
  const [chatSound, setChatSound] = useState(() => isChatSoundEnabled());

  const toggleChatSound = () => {
    setChatSound(prev => {
      const next = !prev;
      setChatSoundEnabled(next);
      if (next) playMessageSentSound();
      toast.success(next ? "Chat sound effects enabled" : "Chat sound effects disabled");
      return next;
    });
  };

  const handleNameSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      toast.error("Full name cannot be empty.");
      return;
    }
    if (trimmed === user?.fullName) return;

    setIsSavingName(true);
    try {
      const res = await updateUserProfile({ fullName: trimmed });
      const updatedName = (res && "fullName" in res && res.fullName) ? res.fullName : trimmed;
      updateCurrentUser({ fullName: updatedName });
      toast.success("Profile name updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile name";
      toast.error(msg);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    // Immediately show local preview for responsiveness
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setIsUploadingAvatar(true);

    try {
      // Compress avatar before uploading to decrease file size and speed up network upload
      let fileToUpload: File = file;
      try {
        const compressionOptions = {
          maxSizeMB: 0.3,          // Max size target ~300KB
          maxWidthOrHeight: 512,   // Downscale to 512x512 max (ideal for avatars)
          useWebWorker: true,      // Non-blocking off-thread processing
          fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
        };
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (compressionErr) {
        console.warn("Avatar compression failed, uploading original file:", compressionErr);
      }

      const res = await uploadUserAvatar(fileToUpload);
      const newTimestamp = Date.now();
      setAvatarTimestamp(newTimestamp);

      // Determine fresh avatarUrl with cache-buster parameter
      const returnedAvatar = (res && typeof res === "object" && "avatarUrl" in res && typeof res.avatarUrl === "string" && res.avatarUrl)
        ? res.avatarUrl
        : (user?.id ? getUserAvatarUrl(user.id, newTimestamp) : undefined);

      // Update AuthContext so TopBar and other components update immediately without a reload
      updateCurrentUser({
        avatarUrl: returnedAvatar,
        avatarUpdatedAt: newTimestamp,
      });

      toast.success("Avatar updated successfully!");
    } catch (err: unknown) {
      setAvatarPreview(null);
      const msg = err instanceof Error ? err.message : "Failed to upload avatar. Please try again.";
      toast.error(msg);
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handlePwSave = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error("Fill in all password fields."); return; }
    if (newPw !== confirmPw)               { toast.error("Passwords don't match.");        return; }
    if (newPw.length < 6)                  { toast.error("Password must be ≥ 6 chars.");   return; }
    setPwLoading(true);
    try {
      await changeUserPassword({ oldPassword: currentPw, newPassword: newPw });
      toast.success("Password changed! Please sign in with your new password.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      await logout();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const activeNavItem = NAV.find(n => n.id === section)!;
  const initials = user?.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const themeOptions = [
    { value: "light"  as const, label: "Light",  icon: Sun,     desc: "Bright & clean" },
    { value: "dark"   as const, label: "Dark",   icon: Moon,    desc: "Easy on the eyes" },
    { value: "system" as const, label: "System", icon: Monitor, desc: "Match your OS" },
  ];

  // ─── Section panels ─────────────────────────────────────────

  const profilePanel = (
    <Panel>
      {/* Avatar row */}
      <FieldRow label="Avatar" hint="Your public profile picture across workspaces.">
        <div className="flex items-center gap-5">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarFileSelect}
          />
          <div
            className="relative group shrink-0 cursor-pointer"
            onClick={() => setShowAvatarModal(true)}
            title="Click to expand photo"
          >
            <UserAvatar
              userId={user?.id}
              fullName={fullName || user?.fullName}
              avatarUrl={avatarPreview || user?.avatarUrl}
              cacheBuster={avatarTimestamp}
              size="xl"
              rounded="2xl"
              className="border-2 border-outline-variant/60 shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
            />
            <div className={cn(
              "absolute inset-0 rounded-2xl bg-black/40 backdrop-blur-[1px] transition-opacity flex items-center justify-center cursor-pointer",
              isUploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              {isUploadingAvatar ? (
                <Loader2 size={22} className="text-white animate-spin" />
              ) : (
                <Maximize2 size={20} className="text-white drop-shadow-sm" />
              )}
            </div>
          </div>
          <div>
            <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant leading-relaxed">
              Click photo to preview. Or change your picture below.
            </p>
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline font-[family-name:var(--font-body)] cursor-pointer disabled:opacity-50"
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : (
                "Change avatar"
              )}
            </button>
          </div>
        </div>
      </FieldRow>

      {/* Name row */}
      <FieldRow label="Full name" hint="Your display name across all boards and tasks.">
        <form onSubmit={handleNameSave} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-full flex-1 min-w-0">
              <TextInput
                value={fullName}
                onChange={setFullName}
                placeholder="Your full name"
                id="full-name"
                name="full-name"
              />
            </div>
            <SaveBtn
              type="submit"
              loading={isSavingName}
              disabled={isSavingName || !fullName.trim() || fullName.trim() === user?.fullName}
              label="Save"
              className="self-start sm:self-auto w-auto px-6"
            />
          </div>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-outline">
            This name will be visible to your team members across tasks, boards, and comments.
          </p>
        </form>
      </FieldRow>

      {/* Email row */}
      <FieldRow label="Email address" hint="Used for sign-in and notifications.">
        <div className="flex flex-col gap-2">
          <TextInput value={user?.email ?? ""} readOnly type="email" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
            <p className="font-[family-name:var(--font-body)] text-[11px] text-secondary font-medium">Verified</p>
          </div>
        </div>
      </FieldRow>

      {/* Member since */}
      <FieldRow label="Member since" hint="When your account was created." last>
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-on-surface">January 2024</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container font-[family-name:var(--font-mono)] text-[11px]">
            Active member
          </span>
        </div>
      </FieldRow>
    </Panel>
  );

  const appearancePanel = (
    <Panel>
      <FieldRow label="Theme" hint="Controls the colour scheme of the entire app on this device.">
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(opt => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); toast.success(`Theme: ${opt.label}`); }}
                className={cn(
                  "relative flex flex-col items-center gap-2.5 px-3 py-5 rounded-2xl border-2 transition-all cursor-pointer group",
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-outline-variant/50 hover:border-primary/30 hover:bg-surface-low"
                )}
              >
                {active && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <Check size={11} className="text-on-primary" />
                  </div>
                )}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  active ? "bg-primary/10" : "bg-surface-container"
                )}>
                  <Icon size={20} className={active ? "text-primary" : "text-on-surface-variant"} />
                </div>
                <span className={cn(
                  "font-[family-name:var(--font-body)] text-[13px] font-semibold",
                  active ? "text-primary" : "text-on-surface"
                )}>
                  {opt.label}
                </span>
                <span className="font-[family-name:var(--font-body)] text-[11px] text-outline">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
        <p className="font-[family-name:var(--font-body)] text-[12px] text-outline mt-3">
          Theme preference is saved locally to this browser.
        </p>
      </FieldRow>

      {/* Sound effects */}
      <FieldRow label="Chat sound effects" hint="Play audio feedback when sending and receiving task comments." last>
        <div className="flex items-center justify-between gap-4">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant">
            {chatSound ? "Enabled" : "Disabled"}
          </p>
          <Toggle on={chatSound} onToggle={toggleChatSound} />
        </div>
      </FieldRow>
    </Panel>
  );

  const securityPanel = (
    <Panel>
      <form
        autoComplete="off"
        onSubmit={e => {
          e.preventDefault();
          handlePwSave();
        }}
      >
        {/* Hidden inputs to divert aggressive browser password autofill */}
        <input type="text" name="fake_username_autofill" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />
        <input type="password" name="fake_password_autofill" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />

        {/* Password */}
        <FieldRow label="Current password" hint="Enter your existing password to confirm your identity.">
          <TextInput
            type="password"
            id="taskflow-verify-old-password"
            name="taskflow-verify-old-password"
            autoComplete="new-password"
            value={currentPw}
            onChange={setCurrentPw}
            placeholder="••••••••"
          />
        </FieldRow>
        <FieldRow label="New password" hint="Must be at least 6 characters.">
          <TextInput
            type="password"
            id="taskflow-new-password"
            name="taskflow-new-password"
            autoComplete="new-password"
            value={newPw}
            onChange={setNewPw}
            placeholder="••••••••"
          />
        </FieldRow>
        <FieldRow label="Confirm new password" hint="Re-enter your new password to confirm.">
          <TextInput
            type="password"
            id="taskflow-confirm-new-password"
            name="taskflow-confirm-new-password"
            autoComplete="new-password"
            value={confirmPw}
            onChange={setConfirmPw}
            placeholder="••••••••"
          />
        </FieldRow>
        <div className="py-5 border-b border-outline-variant/30">
          <SaveBtn type="submit" loading={pwLoading} label="Update password" />
        </div>
      </form>

      {/* Active session */}
      <FieldRow label="Active sessions" hint="Devices where you are currently signed in." last>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-low border border-outline-variant/40">
          <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
            <Shield size={16} className="text-on-surface-variant" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-[family-name:var(--font-body)] text-[13.5px] font-semibold text-on-surface">This device</p>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-outline mt-0.5">{user?.email}</p>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container font-[family-name:var(--font-mono)] text-[11px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            Active now
          </span>
        </div>
      </FieldRow>
    </Panel>
  );

  const sessionPanel = (
    <Panel>
      <FieldRow label="Current session" hint="Your active sign-in on this device.">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-low border border-outline-variant/40">
          <UserAvatar
            userId={user?.id}
            fullName={user?.fullName}
            avatarUrl={user?.avatarUrl}
            cacheBuster={avatarTimestamp}
            size={40}
            rounded="2xl"
          />
          <div className="flex-1 min-w-0">
            <p className="font-[family-name:var(--font-body)] text-[13.5px] font-semibold text-on-surface truncate">{user?.fullName}</p>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-outline truncate">{user?.email}</p>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container font-[family-name:var(--font-mono)] text-[11px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            Active
          </span>
        </div>
      </FieldRow>

      <FieldRow label="Sign out" hint="End your session on this device. You can sign back in any time.">
        <button
          onClick={() => setShowLogout(true)}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-error-container/20 text-error font-[family-name:var(--font-body)] text-[13px] font-semibold hover:bg-error-container/40 active:scale-[0.98] border border-error/20 transition-all cursor-pointer"
        >
          <LogOut size={15} />
          Sign out of this device
        </button>
      </FieldRow>

      {/* Danger zone */}
      <div className="border-t border-outline-variant/30 mt-2 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={15} className="text-error" />
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-error uppercase tracking-widest font-semibold">
            Danger Zone
          </p>
        </div>
        <FieldRow label="Delete account" hint="Permanently remove your account and all of its data. This action is irreversible." last>
          <button
            type="button"
            onClick={() => setShowDeleteStep1(true)}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-error/40 bg-error/5 hover:bg-error-container/30 text-error font-[family-name:var(--font-body)] text-[13px] font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          >
            <Trash2 size={15} />
            Delete my account
          </button>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-outline mt-2">
            Requires typed confirmation. All active sessions and workspace memberships will be revoked immediately.
          </p>
        </FieldRow>
      </div>
    </Panel>
  );

  const panelMap: Record<SectionId, React.ReactNode> = {
    profile:    profilePanel,
    appearance: appearancePanel,
    security:   securityPanel,
    session:    sessionPanel,
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">

      {/* ─── Left nav ──────────────────────────────────────────── */}
      <nav className="hidden md:flex flex-col w-60 shrink-0 border-r border-outline-variant/40 overflow-y-auto">
        {/* Nav header */}
        <div className="px-5 pt-7 pb-4">
          <p className="font-[family-name:var(--font-heading)] text-[18px] font-bold text-on-surface tracking-tight">
            Settings
          </p>
          <p className="font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant mt-0.5">
            Manage your account
          </p>
        </div>

        <div className="flex flex-col px-3 gap-0.5 pb-6">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer w-full group relative",
                  active
                    ? "bg-primary/8 text-primary"
                    : "text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
                )}
              >
                {/* Active left indicator */}
                {active && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
                  />
                )}
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  active ? "bg-primary/10" : "bg-transparent group-hover:bg-surface-container"
                )}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "font-[family-name:var(--font-body)] text-[13px] truncate",
                    active ? "font-semibold" : "font-medium"
                  )}>
                    {item.label}
                  </p>
                </div>
                {active && <ChevronRight size={13} className="shrink-0 opacity-50" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Mobile top nav (select strip) ─────────────────────── */}
      <div className="md:hidden absolute top-16 inset-x-0 z-20 flex overflow-x-auto border-b border-outline-variant bg-surface-lowest px-3 gap-1 shrink-0" style={{ bottom: "unset" }}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={cn(
              "shrink-0 px-3 py-3 font-[family-name:var(--font-body)] text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer",
              section === item.id
                ? "text-primary border-primary"
                : "text-on-surface-variant border-transparent hover:text-on-surface"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ─── Content panel ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar mt-12 md:mt-0">
        <div className="max-w-3xl mx-auto px-5 md:px-10 pt-8 pb-20">

          {/* Section title */}
          <div className="mb-8 pb-6 border-b border-outline-variant/40">
            <div className="flex items-center gap-3">
              {(() => { const Icon = activeNavItem.icon; return (
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary">
                  <Icon size={17} />
                </div>
              ); })()}
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-[22px] font-bold text-on-surface leading-tight">
                  {activeNavItem.label}
                </h1>
                <p className="font-[family-name:var(--font-body)] text-[13px] text-on-surface-variant mt-0.5">
                  {activeNavItem.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Animated panel swap */}
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              {panelMap[section]}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>

      <ConfirmDialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={logout}
        title="Sign out"
        description="You'll be signed out of this device. Sign back in any time."
        confirmText="Sign out"
        variant="destructive"
      />

      {/* Step 1 Account Deletion Dialog */}
      <ConfirmDialog
        open={showDeleteStep1}
        onClose={() => setShowDeleteStep1(false)}
        onConfirm={() => {
          setShowDeleteStep1(false);
          setShowDeleteStep2(true);
        }}
        title="Delete account"
        description="This permanently deletes your account. You'll be logged out everywhere and this cannot be undone."
        confirmText="Delete account"
        variant="destructive"
      />

      {/* Step 2 Dedicated Typed Confirmation Dialog */}
      <DeleteAccountDialog
        open={showDeleteStep2}
        onClose={() => setShowDeleteStep2(false)}
        onConfirm={async () => {
          try {
            await deleteAccount();
            toast.success("Account permanently deleted.");
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to delete account. Please try again.";
            toast.error(msg);
            throw err;
          }
        }}
      />

      {/* WhatsApp-Style Expanded Avatar Preview Modal */}
      <AvatarPreviewModal
        open={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelectNewPhoto={() => avatarInputRef.current?.click()}
        userId={user?.id}
        fullName={fullName || user?.fullName}
        avatarUrl={avatarPreview || user?.avatarUrl}
        cacheBuster={avatarTimestamp}
        isUploading={isUploadingAvatar}
      />
    </div>
  );
}
