"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

interface MobileNavContextType {
  isMobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const MobileNavContext = createContext<MobileNavContextType | undefined>(undefined);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  const openMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen(prev => !prev), []);

  // Automatically close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <MobileNavContext.Provider
      value={{
        isMobileSidebarOpen,
        openMobileSidebar,
        closeMobileSidebar,
        toggleMobileSidebar,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const context = useContext(MobileNavContext);
  if (!context) {
    throw new Error("useMobileNav must be used within MobileNavProvider");
  }
  return context;
}
