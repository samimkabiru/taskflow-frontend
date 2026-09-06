"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      // Preserve return url if desired, or redirect directly to /login
      router.replace("/login");
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-on-surface">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary-container to-primary/80 flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <CheckCircle2 size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">TaskFlow</h2>
            <p className="font-[family-name:var(--font-mono)] text-[12px] text-outline">Checking session...</p>
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
