"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CommandSearchModal from "@/components/search/CommandSearchModal";

export default function SearchPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    router.back();
  };

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <CommandSearchModal open={open} onClose={handleClose} />
      <div className="text-center text-outline font-[family-name:var(--font-body)] text-[14px]">
        Press <kbd className="px-1.5 py-0.5 rounded border border-outline-variant bg-surface text-on-surface font-[family-name:var(--font-mono)] text-[11px]">ESC</kbd> to return
      </div>
    </div>
  );
}
