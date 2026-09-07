"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Loader2, LogIn, RotateCw } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router, pathname]);

  // Track elapsed waiting time to provide reassuring feedback and escape hatches
  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    const isWakingUp = elapsedSeconds >= 3 && elapsedSeconds < 7;
    const isDelayed = elapsedSeconds >= 7;

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-on-surface p-4">
        <div className="flex flex-col items-center gap-5 max-w-sm w-full text-center">
          {/* Animated App Icon */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-primary via-primary-container to-primary/80 flex items-center justify-center text-on-primary shadow-lg shadow-primary/20 animate-pulse">
            <CheckCircle2 size={26} strokeWidth={2.5} />
          </div>

          <div className="flex flex-col items-center gap-1.5 w-full">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-on-surface">
              TaskFlow
            </h2>

            {!isWakingUp && !isDelayed && (
              <p className="font-[family-name:var(--font-mono)] text-[12px] text-outline flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-primary" />
                Checking session...
              </p>
            )}

            {isWakingUp && (
              <div className="flex flex-col items-center gap-1 mt-1">
                <p className="font-[family-name:var(--font-body)] text-[13px] font-medium text-primary flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" />
                  Connecting to backend server...
                </p>
                <p className="font-[family-name:var(--font-body)] text-[11.5px] text-outline max-w-xs leading-relaxed">
                  The server is waking up from sleep on Render. This usually takes around 30–45s on cold start.
                </p>
              </div>
            )}

            {isDelayed && (
              <div className="flex flex-col items-center gap-2 mt-1 w-full">
                <p className="font-[family-name:var(--font-body)] text-[13px] font-medium text-primary flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" />
                  Taking longer than expected...
                </p>
                <p className="font-[family-name:var(--font-body)] text-[11.5px] text-outline max-w-xs leading-relaxed">
                  If you are on Wi-Fi, the network connection may be delayed. You can proceed directly to login or retry.
                </p>

                {/* Escape hatch buttons */}
                <div className="flex items-center justify-center gap-2 mt-3 w-full">
                  <button
                    onClick={() => router.replace("/login")}
                    className="flex-1 py-2 px-3.5 rounded-xl bg-primary text-on-primary font-[family-name:var(--font-body)] text-[13px] font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                  >
                    <LogIn size={15} />
                    Go to Login
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="py-2 px-3.5 rounded-xl border border-outline-variant hover:bg-surface-container font-[family-name:var(--font-body)] text-[13px] font-medium text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCw size={14} />
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
