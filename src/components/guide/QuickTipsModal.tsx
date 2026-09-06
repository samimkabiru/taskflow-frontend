"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Moon,
  Sun,
  Kanban,
  LayoutGrid,
  MessageSquare,
  Command,
  Search,
  Users,
  ChevronRight,
  MousePointer2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickTipsModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Micro-UI Animations for each slide ────────────────────────

// Slide 1: Drag & drop Kanban animation
function KanbanAnimation() {
  return (
    <div className="w-full h-48 sm:h-52 rounded-2xl bg-surface-low border border-outline-variant/40 p-3.5 flex flex-col justify-between overflow-hidden relative select-none">
      {/* Mini board header */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="font-[family-name:var(--font-heading)] text-[12px] font-semibold text-on-surface">
            Sprint Board
          </span>
        </div>
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-outline px-1.5 py-0.5 rounded bg-surface-high">
          Live sync
        </span>
      </div>

      {/* Mini columns */}
      <div className="grid grid-cols-2 gap-3 flex-1 pt-2.5">
        {/* Column 1: To Do */}
        <div className="flex flex-col gap-2 rounded-xl bg-surface/60 p-2 border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-[family-name:var(--font-mono)] font-semibold text-on-surface-variant uppercase tracking-wider">
              To Do
            </span>
            <span className="text-[9.5px] font-[family-name:var(--font-mono)] text-outline">1</span>
          </div>

          <div className="rounded-lg bg-surface-lowest border border-outline-variant/40 p-2 opacity-60">
            <p className="text-[10.5px] font-medium text-on-surface truncate">Prepare release notes</p>
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="flex flex-col gap-2 rounded-xl bg-surface/60 p-2 border border-outline-variant/30 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-[family-name:var(--font-mono)] font-semibold text-primary uppercase tracking-wider">
              In Progress
            </span>
            <span className="text-[9.5px] font-[family-name:var(--font-mono)] text-primary font-bold">1</span>
          </div>

          <div className="h-full rounded-lg border border-dashed border-outline-variant/40 flex items-center justify-center">
            <span className="text-[9.5px] font-[family-name:var(--font-mono)] text-outline">Drop target</span>
          </div>
        </div>
      </div>

      {/* Floating Animated Card that glides from To Do to In Progress */}
      <motion.div
        animate={{
          x: [0, 0, 140, 140, 0],
          y: [0, -10, -10, 24, 0],
          scale: [1, 1.05, 1.05, 1, 1],
          boxShadow: [
            "0 1px 2px rgba(0,0,0,0.05)",
            "0 12px 24px -6px rgba(0,0,0,0.25)",
            "0 12px 24px -6px rgba(0,0,0,0.25)",
            "0 2px 6px rgba(0,0,0,0.08)",
            "0 1px 2px rgba(0,0,0,0.05)",
          ],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.2, 0.6, 0.75, 1],
        }}
        className="absolute top-[52px] left-[20px] w-[130px] rounded-lg bg-surface-lowest border border-primary/40 p-2 shadow-sm z-10"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="px-1 py-0.2 rounded text-[8.5px] font-[family-name:var(--font-mono)] font-semibold bg-primary/15 text-primary">
            HIGH
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
        <p className="text-[10.5px] font-semibold text-on-surface leading-tight truncate">
          Redesign Hero UX
        </p>
      </motion.div>

      {/* Animated cursor grabbing the card */}
      <motion.div
        animate={{
          x: [40, 40, 180, 180, 40],
          y: [68, 60, 60, 96, 68],
          scale: [1, 0.9, 0.9, 1, 1],
          opacity: [0, 1, 1, 0, 0],
        }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.15, 0.6, 0.8, 1],
        }}
        className="absolute pointer-events-none z-20 text-primary drop-shadow-md"
      >
        <MousePointer2 size={18} className="fill-primary" />
      </motion.div>
    </div>
  );
}

// Slide 2: Switch & Create Boards
function BoardSwitchAnimation() {
  return (
    <div className="w-full h-48 sm:h-52 rounded-2xl bg-surface-low border border-outline-variant/40 p-3.5 flex flex-col justify-between overflow-hidden relative select-none">
      {/* Mini top navigation bar */}
      <div className="flex items-center justify-between bg-surface rounded-xl px-3 py-2 border border-outline-variant/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
          <span className="font-[family-name:var(--font-heading)] text-[12px] font-semibold text-on-surface">
            Current Board:
          </span>
          <motion.div
            animate={{ scale: [1, 0.97, 1] }}
            transition={{ duration: 2.8, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-high border border-outline-variant/50 text-[11px] font-medium text-primary"
          >
            <span>🚀 Marketing Launch</span>
          </motion.div>
        </div>
      </div>

      {/* Animated Dropdown Menu displaying boards list and + Create Board */}
      <motion.div
        animate={{
          opacity: [0, 1, 1, 0],
          y: [4, 0, 0, 4],
          scale: [0.96, 1, 1, 0.96],
        }}
        transition={{
          duration: 3.4,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.15, 0.85, 1],
        }}
        className="mt-2 rounded-xl bg-surface-lowest border border-outline-variant/50 shadow-xl p-1.5 flex flex-col gap-1 z-10"
      >
        {/* Board item 1 */}
        <div className="flex items-center justify-between px-2 py-1 rounded-lg text-[11px] text-on-surface">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium">🚀 Marketing Launch</span>
          </div>
          <span className="text-[9.5px] text-outline font-[family-name:var(--font-mono)]">Owner</span>
        </div>

        {/* Board item 2 - highlighted */}
        <motion.div
          animate={{
            backgroundColor: ["rgba(0,0,0,0)", "rgba(var(--color-primary-rgb, 120, 80, 255), 0.12)", "rgba(var(--color-primary-rgb, 120, 80, 255), 0.12)", "rgba(0,0,0,0)"],
          }}
          transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.3, 0.75, 1] }}
          className="flex items-center justify-between px-2 py-1 rounded-lg text-[11px] text-primary font-semibold"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>⚡ Q3 Product Roadmap</span>
          </div>
          <Check size={12} className="text-primary" />
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-outline-variant/30 my-0.5" />

        {/* + Create board action */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] font-semibold text-primary bg-primary/8 hover:bg-primary/15 cursor-pointer"
        >
          <Plus size={13} />
          <span>Create New Board…</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Slide 3: Real-time Collaboration & Chat
function RealtimeChatAnimation() {
  return (
    <div className="w-full h-48 sm:h-52 rounded-2xl bg-surface-low border border-outline-variant/40 p-3.5 flex flex-col justify-between overflow-hidden relative select-none">
      {/* Top team presence indicator */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
        <div className="flex items-center gap-2">
          {/* Stacked mini avatars */}
          <div className="flex -space-x-1.5">
            <div className="w-5 h-5 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center ring-2 ring-surface">
              A
            </div>
            <div className="w-5 h-5 rounded-full bg-secondary text-on-secondary text-[9px] font-bold flex items-center justify-center ring-2 ring-surface">
              L
            </div>
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-surface">
              M
            </div>
          </div>
          <span className="text-[11.5px] font-[family-name:var(--font-heading)] font-semibold text-on-surface">
            Team Presence
          </span>
        </div>

        {/* Active badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold font-[family-name:var(--font-mono)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active now
        </div>
      </div>

      {/* Chat messages animating in */}
      <div className="flex flex-col gap-2 flex-1 justify-center py-2">
        {/* Incoming message */}
        <motion.div
          animate={{
            opacity: [0, 1, 1, 0],
            x: [-12, 0, 0, -12],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            times: [0, 0.15, 0.85, 1],
          }}
          className="self-start max-w-[80%] rounded-2xl rounded-tl-sm bg-surface-high border border-outline-variant/40 px-3 py-1.5 shadow-2xs"
        >
          <p className="text-[9.5px] font-[family-name:var(--font-mono)] text-outline">Alex • just now</p>
          <p className="text-[11px] font-medium text-on-surface">Just moved the auth task to In Progress! 🚀</p>
        </motion.div>

        {/* Outgoing reply */}
        <motion.div
          animate={{
            opacity: [0, 0, 1, 1, 0],
            x: [12, 12, 0, 0, 12],
          }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            times: [0, 0.35, 0.45, 0.85, 1],
          }}
          className="self-end max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-on-primary px-3 py-1.5 shadow-sm"
        >
          <p className="text-[11px] font-medium">Awesome, reviewing the PR now! 👍</p>
        </motion.div>
      </div>

      {/* Mini real-time activity status */}
      <div className="pt-1 text-center">
        <p className="text-[10px] font-[family-name:var(--font-mono)] text-outline">
          Instant board updates via WebSocket
        </p>
      </div>
    </div>
  );
}

// Slide 4: Customization, Themes & Shortcuts
function CustomizationAnimation() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsDark((prev) => !prev);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-48 sm:h-52 rounded-2xl bg-surface-low border border-outline-variant/40 p-3.5 flex flex-col justify-between overflow-hidden relative select-none">
      {/* Theme toggle & Avatar expand preview */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          {/* Mini expandable avatar */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="w-7 h-7 rounded-xl bg-primary text-on-primary font-bold text-[11px] flex items-center justify-center shadow-sm cursor-pointer"
          >
            TD
          </motion.div>
          <div>
            <p className="text-[11.5px] font-semibold font-[family-name:var(--font-heading)] text-on-surface">
              Click photo to expand
            </p>
            <p className="text-[9.5px] text-outline font-[family-name:var(--font-mono)]">Instant preview & caching</p>
          </div>
        </div>

        {/* Animated Theme switch indicator */}
        <motion.div
          animate={{
            backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-outline-variant/60 text-[10.5px] font-semibold font-[family-name:var(--font-mono)] shadow-2xs"
        >
          {isDark ? <Moon size={12} className="text-amber-400" /> : <Sun size={12} className="text-amber-500" />}
          <span>{isDark ? "Dark" : "Light"}</span>
        </motion.div>
      </div>

      {/* Keyboard Shortcuts showcase */}
      <div className="flex flex-col gap-2 py-1">
        <p className="text-[10.5px] font-semibold text-outline uppercase tracking-wider font-[family-name:var(--font-mono)]">
          Pro Shortcuts
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-outline-variant/40">
            <span className="text-[11px] font-medium text-on-surface">Quick search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-high border border-outline-variant text-[10px] font-mono text-primary font-bold">
              ⌘K
            </kbd>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-outline-variant/40">
            <span className="text-[11px] font-medium text-on-surface">Dismiss / Close</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-high border border-outline-variant text-[10px] font-mono text-outline font-semibold">
              Esc
            </kbd>
          </div>
        </div>
      </div>

      <div className="text-center pt-1">
        <p className="text-[10px] font-[family-name:var(--font-mono)] text-primary font-medium">
          Fast, keyboard-friendly & responsive everywhere
        </p>
      </div>
    </div>
  );
}

// ─── Main Guide Modal Component ────────────────────────────────

export default function QuickTipsModal({ open, onClose }: QuickTipsModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const slides = [
    {
      id: "tasks",
      badge: "Kanban & Workflow",
      badgeIcon: Kanban,
      title: "Drag, drop & organize tasks",
      desc: "Effortlessly manage your pipeline. Drag cards between columns to update status, and click any card to add attachments, tags, or comments.",
      animation: <KanbanAnimation />,
    },
    {
      id: "boards",
      badge: "Project Workspaces",
      badgeIcon: LayoutGrid,
      title: "Switch & create boards",
      desc: "Switch between project boards in a snap right from the top bar dropdown, or spin up a new board with custom accent colors.",
      animation: <BoardSwitchAnimation />,
    },
    {
      id: "chat",
      badge: "Real-time Collaboration",
      badgeIcon: MessageSquare,
      title: "Live chat & member presence",
      desc: "Collaborate with your team without leaving your board. See who is currently active, exchange ideas live in board chat, and get instant notifications.",
      animation: <RealtimeChatAnimation />,
    },
    {
      id: "shortcuts",
      badge: "Speed & Customization",
      badgeIcon: Sparkles,
      title: "Personalize & navigate fast",
      desc: "Customize your avatar, switch between clean Light and sleek Dark modes, and use hotkeys like ⌘K to search tasks and boards instantly.",
      animation: <CustomizationAnimation />,
    },
  ];

  // Mark tips as seen in localStorage
  const handleDismissForever = () => {
    try {
      localStorage.setItem("taskflow_seen_tips_v1", "true");
    } catch {}
    onClose();
  };

  // Keyboard navigation: Left, Right, Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && currentSlide === slides.length - 1) {
        handleDismissForever();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentSlide, slides.length, onClose]);

  // Touch Swipe navigation on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (diffX > 45) {
      // Swiped left -> next
      setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
    } else if (diffX < -45) {
      // Swiped right -> prev
      setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };

  const current = slides[currentSlide];
  const BadgeIcon = current.badgeIcon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          {/* Backdrop with smooth blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Card */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-[480px] bg-surface rounded-t-3xl sm:rounded-3xl border border-outline-variant/60 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
          >
            {/* Mobile drag pill indicator */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-outline-variant/60" />
            </div>

            {/* Header with Quick Tips badge & Close button */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Sparkles size={13} className="text-primary" />
                <span className="font-[family-name:var(--font-heading)] text-[11.5px] font-semibold tracking-wide">
                  Quick Tips & Guide
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close tips"
                className="w-8 h-8 rounded-full bg-surface-high hover:bg-surface-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all cursor-pointer border border-outline-variant/40 active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Slide Content Area */}
            <div className="p-5 flex-1 overflow-y-auto">
              {/* Micro UI animation container */}
              <div className="mb-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    {current.animation}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slide text description */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id + "-text"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-primary text-[11px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider">
                    <BadgeIcon size={12} />
                    <span>{current.badge}</span>
                  </div>

                  <h3 className="text-[17px] sm:text-[18px] font-bold font-[family-name:var(--font-heading)] text-on-surface leading-snug">
                    {current.title}
                  </h3>

                  <p className="text-[13px] font-[family-name:var(--font-body)] text-on-surface-variant leading-relaxed">
                    {current.desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer with Step Dots & Navigation */}
            <div className="px-5 py-3.5 bg-surface-low/80 border-t border-outline-variant/30 flex items-center justify-between gap-3">
              {/* Slide Dots Indicator */}
              <div className="flex items-center gap-1.5">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Go to tip ${idx + 1}`}
                    className={cn(
                      "transition-all duration-300 rounded-full cursor-pointer",
                      idx === currentSlide
                        ? "w-6 h-1.5 bg-primary"
                        : "w-1.5 h-1.5 bg-outline-variant hover:bg-outline"
                    )}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {currentSlide > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentSlide((prev) => prev - 1)}
                    className="px-3 py-1.5 rounded-xl text-[12.5px] font-semibold text-on-surface hover:bg-surface-high active:scale-95 transition-all font-[family-name:var(--font-body)] cursor-pointer"
                  >
                    Back
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isLast) {
                      handleDismissForever();
                    } else {
                      setCurrentSlide((prev) => prev + 1);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-on-primary hover:opacity-90 active:scale-95 text-[12.5px] font-semibold shadow-sm transition-all font-[family-name:var(--font-body)] cursor-pointer"
                >
                  <span>{isLast ? "Get Started" : "Next"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
