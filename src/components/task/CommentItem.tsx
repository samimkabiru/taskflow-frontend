"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
      className="flex gap-2.5 sm:gap-3 items-start group/comment relative shrink-0"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
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
            "relative rounded-xl rounded-tl-sm p-3 transition-all border group/bubble cursor-pointer",
            isEditing
              ? "ring-2 ring-primary/50 border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
              : isAuthor
              ? "bg-surface-low/95 dark:bg-surface-lowest/90 border-outline-variant/60 shadow-2xs hover:border-outline-variant/90"
              : "bg-surface/90 dark:bg-surface/80 border-outline-variant/50 shadow-2xs hover:border-outline-variant/80"
          )}
        >
          {/* Comment Content */}
          <div className="relative pr-6">
            <MessageRenderer text={comment.content} />

            {/* Top-Right Corner Action Menu Trigger */}
            <div className="absolute -top-1.5 -right-3 flex items-center">
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger
                  className={cn(
                    "p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-high/80 transition-all cursor-pointer",
                    "opacity-70 sm:opacity-0 sm:group-hover/bubble:opacity-100 focus:opacity-100",
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
    </motion.div>
  );
}
