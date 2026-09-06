"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Search, PanelLeft, UserCheck } from "lucide-react";
import { useMobileNav } from "@/contexts/MobileNavContext";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();
  const { openMobileSidebar, isMobileSidebarOpen } = useMobileNav();

  const handleOpenSearch = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-3 h-16 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/60 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] select-none">
      {/* 1. Boards */}
      <Link
        href="/boards"
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-95",
          pathname === "/boards" || pathname.startsWith("/boards/")
            ? "text-primary font-semibold"
            : "text-on-surface-variant hover:text-on-surface"
        )}
      >
        <LayoutDashboard size={20} strokeWidth={pathname === "/boards" ? 2.3 : 1.8} />
        <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-tight">
          Boards
        </span>
      </Link>

      {/* 2. Search */}
      <button
        type="button"
        onClick={handleOpenSearch}
        className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-on-surface-variant hover:text-primary transition-all duration-150 active:scale-95 cursor-pointer"
        aria-label="Search"
      >
        <Search size={20} strokeWidth={1.8} />
        <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-tight">
          Search
        </span>
      </button>

      {/* 3. Workspace Drawer Menu */}
      <button
        type="button"
        onClick={openMobileSidebar}
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
          isMobileSidebarOpen
            ? "bg-primary/10 text-primary font-semibold"
            : "text-on-surface-variant hover:text-primary"
        )}
        aria-label="Workspace Menu"
      >
        <PanelLeft size={20} strokeWidth={isMobileSidebarOpen ? 2.3 : 1.8} />
        <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-tight">
          Workspace
        </span>
      </button>

      {/* 4. Settings */}
      <Link
        href="/settings"
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-95",
          pathname === "/settings"
            ? "text-primary font-semibold"
            : "text-on-surface-variant hover:text-on-surface"
        )}
      >
        <Settings size={20} strokeWidth={pathname === "/settings" ? 2.3 : 1.8} />
        <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-tight">
          Settings
        </span>
      </Link>
    </nav>
  );
}
