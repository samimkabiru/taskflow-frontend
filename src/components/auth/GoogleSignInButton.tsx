"use client";

import { useEffect } from "react";
import { GoogleLogin, CredentialResponse, googleLogout } from "@react-oauth/google";
import { Loader2 } from "lucide-react";

interface GoogleSignInButtonProps {
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: () => void;
  isLoading?: boolean;
  text?: string;
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  isLoading = false,
  text = "Continue with Google",
}: GoogleSignInButtonProps) {
  // Disable automatic selection on mount to force the Google Account Chooser
  // so the user is always presented with their list of emails
  useEffect(() => {
    try {
      googleLogout();
    } catch {
      // no-op if Google script not initialized yet
    }
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-10 px-4 rounded-full border border-outline-variant/60 bg-surface-low/80 dark:bg-surface-high/60 flex items-center justify-center gap-2.5 text-on-surface-variant font-[family-name:var(--font-body)] text-[13.5px] font-medium shadow-2xs select-none">
        <Loader2 size={16} className="animate-spin text-primary shrink-0" />
        <span>Signing you in with Google…</span>
      </div>
    );
  }

  return (
    <div className="group relative w-full h-10 rounded-full overflow-hidden">
      {/* ── Custom Native Button UI (Always full-width, never shrinks, never personalizes) ── */}
      <div className="w-full h-full px-4 rounded-full border border-outline-variant/60 bg-surface-low/80 dark:bg-surface-high/60 group-hover:bg-surface-low group-hover:border-outline-variant dark:group-hover:bg-surface-high flex items-center justify-center gap-2.5 text-on-surface font-[family-name:var(--font-body)] text-[13.5px] font-medium shadow-2xs select-none transition-all cursor-pointer">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="truncate">{text}</span>
      </div>

      {/* ── Invisible Google Identity Trigger Overlay ── */}
      <div className="absolute inset-0 z-10 opacity-[0.0001] cursor-pointer overflow-hidden flex items-center justify-center [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!scale-[2.5] [&_iframe]:!origin-center">
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          auto_select={false}
          theme="outline"
          size="large"
          shape="pill"
          text="continue_with"
          width="400"
        />
      </div>
    </div>
  );
}
