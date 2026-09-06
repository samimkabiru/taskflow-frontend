"use client";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
