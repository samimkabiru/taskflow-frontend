"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Pencil, Trash2, Copy, Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SimpleTooltip } from "@/components/ui/tooltip";
import MessageRenderer from "@/components/chat/MessageRenderer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import type { Comment, User } from "@/lib/types";

interface CommentItemProps {
  comment: Comment;
  currentUser?: User;
  isEditing?: boolean;
  onStartEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}

function formatRelative(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CommentItem({
  comment,
  currentUser,
  isEditing = false,
  onStartEdit,
  onDelete,
}: CommentItemProps) {
  const isAuthor = currentUser?.id === comment.authorId || currentUser?.id === comment.author?.id;
  const isEdited = Boolean(
    comment.updatedAt &&
    new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Touch long-press handling for mobile comments
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const isLongPressActiveRef = useRef<boolean>(false);

  const handleTouchStart = () => {
    touchMovedRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        isLongPressActiveRef.current = true;
        if (typeof window !== "undefined" && window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
        setMobileDrawerOpen(true);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {
            // Ignore if vibration not permitted
          }
        }
        setTimeout(() => {
          isLongPressActiveRef.current = false;
        }, 800);
      }
    }, 400);
  };

  const handleTouchMove = () => {
    touchMovedRef.current = true;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(comment.content);
      toast.success("Comment copied to clipboard!");
    } catch {
      toast.error("Failed to copy text");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-2.5 sm:gap-3 items-start group/comment relative shrink-0 select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window !== "undefined" && window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
        const isMobile = typeof window !== "undefined" && (window.innerWidth < 640 || window.matchMedia("(pointer: coarse)").matches);
        if (isMobile || isLongPressActiveRef.current) {
          setMobileDrawerOpen(true);
        } else {
          setMenuOpen(true);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Author Avatar */}
      <UserAvatar
        userId={comment.author?.id || comment.authorId}
        fullName={comment.author?.fullName}
        avatarUrl={comment.author?.avatarUrl}
        rounded="xl"
        className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 mt-0.5"
      />

      {/* Main Comment Bubble Container */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Author Header Row */}
        <div className="flex items-center justify-between gap-2 mb-1 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-[family-name:var(--font-body)] text-[12.5px] font-semibold text-on-surface truncate">
              {comment.author?.fullName || "User"}
            </span>

            {isAuthor && (
              <span className="font-[family-name:var(--font-mono)] text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/20 shrink-0">
                You
              </span>
            )}

            <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline shrink-0">
              {formatRelative(comment.createdAt)}
            </span>

            {isEdited && (
              <SimpleTooltip
                content={`Edited ${new Date(comment.updatedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`}
              >
                <span className="font-[family-name:var(--font-body)] text-[10.5px] text-outline italic cursor-help hover:text-on-surface-variant transition-colors flex items-center gap-0.5">
                  <Clock size={10} className="shrink-0" />
                  (edited)
                </span>
              </SimpleTooltip>
            )}
          </div>
        </div>

        {/* Comment Bubble Surface */}
        <div
          className={cn(
            "relative rounded-xl rounded-tl-sm p-3 transition-all border group/bubble cursor-pointer select-none",
            isEditing
              ? "ring-2 ring-primary/50 border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
              : isAuthor
              ? "bg-surface-low/95 dark:bg-surface-lowest/90 border-outline-variant/60 shadow-2xs hover:border-outline-variant/90"
              : "bg-surface/90 dark:bg-surface/80 border-outline-variant/50 shadow-2xs hover:border-outline-variant/80"
          )}
          style={{
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          {/* Comment Content */}
          <div className="relative pr-2 sm:pr-6">
            <MessageRenderer text={comment.content} />

            {/* Desktop Top-Right Corner Action Menu Trigger - completely hidden on mobile (<sm), visible on desktop hover */}
            <div className="hidden sm:flex absolute -top-1.5 -right-3 items-center">
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger
                  className={cn(
                    "p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-high/80 transition-all cursor-pointer",
                    "opacity-0 group-hover/bubble:opacity-100 focus:opacity-100",
                    menuOpen && "opacity-100 bg-surface-high text-on-surface"
                  )}
                  aria-label="Comment options"
                >
                  <ChevronDown size={13} strokeWidth={2.5} />
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-42 p-1 bg-surface border-outline-variant/60 shadow-xl rounded-xl">
                  {/* Copy Text Option */}
                  <DropdownMenuItem
                    onClick={handleCopyText}
                    className="flex items-center gap-2 py-1.5 px-2.5 text-[12px] font-medium cursor-pointer rounded-lg text-on-surface hover:bg-surface-high"
                  >
                    <Copy size={13} className="text-outline" />
                    <span>Copy Text</span>
                  </DropdownMenuItem>

                  {/* Edit Option (Owner only) */}
                  {isAuthor && (
                    <DropdownMenuItem
                      onClick={() => onStartEdit(comment)}
                      className="flex items-center gap-2 py-1.5 px-2.5 text-[12px] font-medium cursor-pointer rounded-lg text-on-surface hover:bg-surface-high"
                    >
                      <Pencil size={13} className="text-outline" />
                      <span>Edit Comment</span>
                    </DropdownMenuItem>
                  )}

                  {/* Delete Option (Owner only) */}
                  {isAuthor && (
                    <>
                      <DropdownMenuSeparator className="my-1 bg-outline-variant/30" />
                      <DropdownMenuItem
                        onClick={() => onDelete(comment)}
                        className="flex items-center gap-2 py-1.5 px-2.5 text-[12px] font-medium cursor-pointer rounded-lg text-error hover:bg-error-container/20 focus:text-error"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Comment Action Sheet Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative z-10 w-full bg-surface border-t border-outline-variant/60 rounded-t-2xl p-4 shadow-2xl flex flex-col gap-1.5 pb-8"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-outline-variant/60 self-center mb-2" />

              {/* Snippet preview */}
              <div className="px-2 py-1 mb-2 text-[12px] text-outline line-clamp-2 italic border-b border-outline-variant/30 font-[family-name:var(--font-body)]">
                "{comment.content}"
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => {
                  handleCopyText();
                  setMobileDrawerOpen(false);
                }}
                className="flex items-center gap-3 w-full py-3 px-3.5 rounded-xl text-[14px] font-medium text-on-surface hover:bg-surface-high active:bg-surface-high transition-colors text-left cursor-pointer"
              >
                <Copy size={16} className="text-outline" />
                <span>Copy Text</span>
              </button>

              {isAuthor && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onStartEdit(comment);
                  }}
                  className="flex items-center gap-3 w-full py-3 px-3.5 rounded-xl text-[14px] font-medium text-on-surface hover:bg-surface-high active:bg-surface-high transition-colors text-left cursor-pointer"
                >
                  <Pencil size={16} className="text-outline" />
                  <span>Edit Comment</span>
                </button>
              )}

              {isAuthor && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onDelete(comment);
                  }}
                  className="flex items-center gap-3 w-full py-3 px-3.5 rounded-xl text-[14px] font-medium text-error hover:bg-error-container/20 active:bg-error-container/20 transition-colors text-left cursor-pointer"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="mt-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-outline hover:text-on-surface active:bg-surface-high transition-colors text-center border border-outline-variant/40 cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
