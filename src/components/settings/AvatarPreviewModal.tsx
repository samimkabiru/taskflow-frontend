"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2 } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";

interface AvatarPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onSelectNewPhoto: () => void;
  userId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  cacheBuster?: string | number;
  isUploading?: boolean;
}

export default function AvatarPreviewModal({
  open,
  onClose,
  onSelectNewPhoto,
  userId,
  fullName,
  avatarUrl,
  cacheBuster,
  isUploading = false,
}: AvatarPreviewModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop with smooth blur and dimming */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Expanded Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 8 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 320,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center z-10"
          >
            {/* Top Close Button */}
            <div className="w-full flex justify-end mb-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm border border-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Photo Card with Hover Overlay */}
            <div className="relative group w-72 h-72 sm:w-88 sm:h-88 rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-surface-lowest">
              <UserAvatar
                userId={userId}
                fullName={fullName}
                avatarUrl={avatarUrl}
                cacheBuster={cacheBuster}
                size={352}
                rounded="2xl"
                className="w-full h-full border-none shadow-none rounded-3xl"
                imageClassName="rounded-3xl"
              />

              {/* Hover overlay with Change Picture button */}
              <div
                className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 flex flex-col items-center justify-center gap-2 ${
                  isUploading ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <button
                  type="button"
                  onClick={onSelectNewPhoto}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/25 hover:bg-white/35 active:scale-95 text-white font-medium text-[13.5px] font-[family-name:var(--font-body)] backdrop-blur-md border border-white/40 shadow-xl transition-all cursor-pointer"
                >
                  <Camera size={17} />
                  <span>Change photo</span>
                </button>
                <p className="text-white/70 text-[11px] font-[family-name:var(--font-body)] tracking-wide">
                  JPG, PNG, or WebP
                </p>
              </div>

              {/* In-flight upload state overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 z-20">
                  <Loader2 size={32} className="text-white animate-spin" />
                  <p className="text-white text-[13px] font-medium font-[family-name:var(--font-body)]">
                    Updating photo…
                  </p>
                </div>
              )}
            </div>

            {/* User display name below preview */}
            {fullName && (
              <p className="mt-4 font-[family-name:var(--font-heading)] text-white/90 font-semibold text-[15px] drop-shadow-sm text-center">
                {fullName}
              </p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
