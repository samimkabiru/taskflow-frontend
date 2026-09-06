"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="h-full h-dvh w-full flex flex-col justify-between items-center bg-background relative overflow-y-auto overflow-x-hidden custom-scrollbar selection:bg-primary/20 selection:text-primary">
      {/* ── Dynamic Ambient Background ──────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft gradient ambient spheres */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl opacity-70 dark:opacity-40" />
        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl opacity-50 dark:opacity-30" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[500px] h-[500px] bg-gradient-to-tl from-tertiary/10 to-transparent rounded-full blur-3xl opacity-50 dark:opacity-30" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,100,100,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,100,100,0.04)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* ── Top Header ──────────────────────────────────────── */}
      <header className="w-full max-w-6xl px-6 py-5 flex items-center justify-between z-10 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
            <CheckCircle2 size={18} strokeWidth={2.5} />
          </div>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[17px] text-on-surface tracking-tight group-hover:text-primary transition-colors">
            TaskFlow
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {mounted && (
            <SimpleTooltip content={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} mode`}>
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl border border-outline-variant/60 bg-surface/70 backdrop-blur-md hover:bg-surface-high hover:border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all cursor-pointer shadow-2xs"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </SimpleTooltip>
          )}
        </div>
      </header>

      {/* ── Main Auth Content ────────────────────────────────── */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-6 md:py-10 z-10 shrink-0 my-auto">
        {children}
      </main>

      {/* ── Footer / Trust Badges ────────────────────────────── */}
      <footer className="w-full max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11.5px] font-[family-name:var(--font-mono)] text-outline z-10 shrink-0 border-t border-outline-variant/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-primary" />
            <span>256-bit SSL Encrypted</span>
          </div>
        </div>

        <div>
          <span>© {new Date().getFullYear()} TaskFlow Inc. Calm Productivity.</span>
        </div>
      </footer>
    </div>
    </GoogleOAuthProvider>
  );
}
