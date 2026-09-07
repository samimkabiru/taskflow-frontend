"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2 } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/boards");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  // Safety fallback: if session checking hangs for 6 seconds on root, redirect to login
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading && !user) {
        router.replace("/login");
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [isLoading, user, router]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-on-surface">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary-container to-primary/80 flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
          <CheckCircle2 size={24} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">TaskFlow</h2>
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-outline">Loading...</p>
        </div>
      </div>
    </div>
  );
}
