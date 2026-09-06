"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, LayoutDashboard, Search, FileQuestion,
  HelpCircle, Compass, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionButton {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ElementType;
}

export interface NotFoundStateProps {
  type?: "board" | "task" | "page" | "activity" | "settings";
  title?: string;
  description?: string;
  resourceId?: string;
  primaryAction?: ActionButton;
  secondaryAction?: ActionButton;
  className?: string;
}

interface StateConfig {
  badge: string;
  defaultTitle: string;
  defaultDesc: string;
  MainIcon: React.ElementType;
  iconColor: string;
  iconBg: string;
  glowColor: string;
  primary: ActionButton;
  secondary: ActionButton;
}

export default function NotFoundState({
  type = "page",
  title,
  description,
  resourceId,
  primaryAction,
  secondaryAction,
  className,
}: NotFoundStateProps) {
  // Default configurations based on type with distinct, non-redundant targets
  const config = React.useMemo<StateConfig>(() => {
    switch (type) {
      case "board":
        return {
          badge: "404 • Board Unavailable",
          defaultTitle: "Board Not Found",
          defaultDesc: "This board may have been renamed, archived, deleted, or you might not have the required access permissions.",
          MainIcon: LayoutDashboard,
          iconColor: "text-primary",
          iconBg: "bg-primary/10 border-primary/20",
          glowColor: "from-primary/20 via-primary/5 to-transparent",
          primary: {
            label: "View All Boards",
            href: "/boards",
            icon: LayoutDashboard,
          },
          secondary: {
            label: "Search Workspace",
            href: "/search",
            icon: Search,
          },
        };
      case "task":
        return {
          badge: "404 • Task Missing",
          defaultTitle: "Task Not Found",
          defaultDesc: "We couldn't locate this task. It might have been completed, moved to another board, or removed.",
          MainIcon: FileQuestion,
          iconColor: "text-amber-500",
          iconBg: "bg-amber-500/10 border-amber-500/20",
          glowColor: "from-amber-500/20 via-amber-500/5 to-transparent",
          primary: {
            label: "Back to Board",
            href: "/boards",
            icon: ArrowLeft,
          },
          secondary: {
            label: "Search Tasks",
            href: "/search",
            icon: Search,
          },
        };
      case "activity":
        return {
          badge: "Activity Unavailable",
          defaultTitle: "Activity Feed Not Found",
          defaultDesc: "Unable to load audit activity for this board. The board may not exist or access has been restricted.",
          MainIcon: ShieldAlert,
          iconColor: "text-rose-500",
          iconBg: "bg-rose-500/10 border-rose-500/20",
          glowColor: "from-rose-500/20 via-rose-500/5 to-transparent",
          primary: {
            label: "View All Boards",
            href: "/boards",
            icon: LayoutDashboard,
          },
          secondary: {
            label: "Search Workspace",
            href: "/search",
            icon: Search,
          },
        };
      case "settings":
        return {
          badge: "Settings Unavailable",
          defaultTitle: "Board Settings Not Found",
          defaultDesc: "You cannot manage settings for a board that doesn't exist or is currently inaccessible.",
          MainIcon: ShieldAlert,
          iconColor: "text-indigo-500",
          iconBg: "bg-indigo-500/10 border-indigo-500/20",
          glowColor: "from-indigo-500/20 via-indigo-500/5 to-transparent",
          primary: {
            label: "View All Boards",
            href: "/boards",
            icon: LayoutDashboard,
          },
          secondary: {
            label: "Search Workspace",
            href: "/search",
            icon: Search,
          },
        };
      default:
        return {
          badge: "404 • Not Found",
          defaultTitle: "Page Not Found",
          defaultDesc: "The page you're looking for doesn't exist, has moved, or is temporarily unavailable.",
          MainIcon: Compass,
          iconColor: "text-primary",
          iconBg: "bg-primary/10 border-primary/20",
          glowColor: "from-primary/20 via-primary/5 to-transparent",
          primary: {
            label: "View All Boards",
            href: "/boards",
            icon: LayoutDashboard,
          },
          secondary: {
            label: "Search Workspace",
            href: "/search",
            icon: Search,
          },
        };
    }
  }, [type]);

  const effTitle = title || config.defaultTitle;
  const effDesc = description || config.defaultDesc;
  const effPrimary = primaryAction || config.primary;
  const effSecondary = secondaryAction || config.secondary;
  const IconComponent = config.MainIcon;

  return (
    <div className={cn("relative flex-1 w-full min-h-[480px] flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none", className)}>
      {/* ─── Ambient Glow & Background Grid ───────────────────── */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] rounded-full blur-[100px] pointer-events-none opacity-60 bg-gradient-to-b",
          config.glowColor
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#8882_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

      {/* ─── Main Glassmorphic Card Container ───────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-md w-full bg-surface/75 dark:bg-surface-lowest/80 backdrop-blur-2xl border border-outline-variant/60 shadow-2xl rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center"
      >
        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-high/80 border border-outline-variant/50 text-[11px] font-semibold font-[family-name:var(--font-mono)] text-outline uppercase tracking-wider mb-6 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
          <span>{config.badge}</span>
        </div>

        {/* Hero Icon with layered aura */}
        <div className="relative mb-5">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-surface-low border border-outline-variant/60 flex items-center justify-center shadow-lg relative z-10 group transition-transform duration-300 hover:scale-105">
            <div className={cn("w-13 h-13 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center border", config.iconBg)}>
              <IconComponent size={26} className={cn("transition-transform duration-300 group-hover:scale-110", config.iconColor)} strokeWidth={2} />
            </div>
          </div>
          <div className="absolute -top-1 -right-1 w-5.5 h-5.5 rounded-full bg-surface-highest border border-outline-variant/80 flex items-center justify-center text-outline shadow-sm z-20">
            <HelpCircle size={12} />
          </div>
        </div>

        {/* Heading & Context Message */}
        <h1 className="font-[family-name:var(--font-heading)] text-[20px] sm:text-[24px] font-bold text-on-surface mb-2 tracking-tight leading-snug">
          {effTitle}
        </h1>

        {resourceId && (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-surface-high border border-outline-variant/50 text-[11px] font-[family-name:var(--font-mono)] text-outline mb-3">
            <span>ID:</span>
            <span className="text-on-surface font-medium">{resourceId}</span>
          </div>
        )}

        <p className="font-[family-name:var(--font-body)] text-[13px] sm:text-[13.5px] text-on-surface-variant leading-relaxed max-w-xs mb-7">
          {effDesc}
        </p>

        {/* Clean, Non-redundant Dual Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full">
          {/* Primary Action Button */}
          {effPrimary && (
            effPrimary.href ? (
              <Link
                href={effPrimary.href}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-[family-name:var(--font-body)] text-[13px] font-semibold px-4.5 py-2.5 rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                {effPrimary.icon && React.createElement(effPrimary.icon, { size: 15, strokeWidth: 2.2 })}
                <span>{effPrimary.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={effPrimary.onClick}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-[family-name:var(--font-body)] text-[13px] font-semibold px-4.5 py-2.5 rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                {effPrimary.icon && React.createElement(effPrimary.icon, { size: 15, strokeWidth: 2.2 })}
                <span>{effPrimary.label}</span>
              </button>
            )
          )}

          {/* Secondary Action Button */}
          {effSecondary && (
            effSecondary.href ? (
              <Link
                href={effSecondary.href}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-surface-low text-on-surface hover:bg-surface-high border border-outline-variant/60 font-[family-name:var(--font-body)] text-[13px] font-medium px-4 py-2.5 rounded-xl hover:border-outline-variant active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
              >
                {effSecondary.icon && React.createElement(effSecondary.icon, { size: 14, strokeWidth: 2 })}
                <span>{effSecondary.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={effSecondary.onClick}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-surface-low text-on-surface hover:bg-surface-high border border-outline-variant/60 font-[family-name:var(--font-body)] text-[13px] font-medium px-4 py-2.5 rounded-xl hover:border-outline-variant active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
              >
                {effSecondary.icon && React.createElement(effSecondary.icon, { size: 14, strokeWidth: 2 })}
                <span>{effSecondary.label}</span>
              </button>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
