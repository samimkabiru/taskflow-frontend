"use client";

import { useState, useEffect } from "react";
import { getUserAvatarUrl } from "@/services/userService";
import { cn } from "@/lib/utils";
import { User as UserIcon } from "lucide-react";

interface UserAvatarProps {
  userId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  rounded?: "full" | "xl" | "2xl" | "lg";
  className?: string;
  imageClassName?: string;
  cacheBuster?: string | number;
}

const SIZE_MAP = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-6 h-6 text-[10px]",
  md: "w-8.5 h-8.5 text-xs",
  lg: "w-11 h-11 text-sm font-semibold",
  xl: "w-20 h-20 text-2xl font-bold",
};

const ROUNDED_MAP = {
  full: "rounded-full",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export default function UserAvatar({
  userId,
  fullName,
  avatarUrl,
  size = "md",
  rounded = "xl",
  className,
  imageClassName,
  cacheBuster,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Compute effective image URL
  const effectiveUrl = (() => {
    // 1. Direct local preview or data URL
    if (avatarUrl && (avatarUrl.startsWith("blob:") || avatarUrl.startsWith("data:"))) {
      return avatarUrl;
    }
    // 2. Explicit cache-buster provided with userId
    if (userId && cacheBuster) {
      return getUserAvatarUrl(userId, cacheBuster);
    }
    // 3. Avatar URL already includes cache buster parameter
    if (avatarUrl && avatarUrl.includes("?t=")) {
      return avatarUrl;
    }
    // 4. External URL (e.g. Google OAuth profile image)
    if (avatarUrl && avatarUrl.startsWith("http") && !avatarUrl.includes("/users/")) {
      return avatarUrl;
    }
    // 5. Standard backend avatar endpoint by userId
    if (userId) {
      return getUserAvatarUrl(userId, cacheBuster);
    }
    return avatarUrl || undefined;
  })();

  // Reset error state if effectiveUrl changes
  useEffect(() => {
    setHasError(false);
  }, [effectiveUrl]);

  // If an error occurred due to a transient network hiccup, retry when window refocuses or comes online
  useEffect(() => {
    if (!hasError) return;
    const handleRetry = () => setHasError(false);
    window.addEventListener("online", handleRetry);
    window.addEventListener("focus", handleRetry);
    return () => {
      window.removeEventListener("online", handleRetry);
      window.removeEventListener("focus", handleRetry);
    };
  }, [hasError]);

  const initials = fullName
    ?.split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "";

  const sizeClass = typeof size === "string" ? SIZE_MAP[size] : "";
  const customInlineStyle = typeof size === "number" ? { width: size, height: size, fontSize: size * 0.4 } : undefined;
  const roundedClass = ROUNDED_MAP[rounded] || "rounded-xl";

  return (
    <div
      style={customInlineStyle}
      className={cn(
        "relative select-none overflow-hidden shrink-0 flex items-center justify-center bg-primary text-on-primary font-[family-name:var(--font-heading)] font-semibold border border-outline-variant/50 shadow-2xs",
        sizeClass,
        roundedClass,
        className
      )}
    >
      {effectiveUrl && !hasError ? (
        <img
          src={effectiveUrl}
          alt={fullName || "User avatar"}
          className={cn("w-full h-full object-cover", roundedClass, imageClassName)}
          onError={() => setHasError(true)}
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <UserIcon size={typeof size === "number" ? size * 0.5 : 14} className="opacity-80" />
      )}
    </div>
  );
}
