"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CheckCircle2, Info, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={1300}
      gap={8}
      icons={{
        success: (
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
        ),
        info: (
          <Info size={16} className="text-primary shrink-0 mt-0.5" />
        ),
        warning: (
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        ),
        error: (
          <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />
        ),
        loading: (
          <Loader2 size={16} className="text-primary shrink-0 mt-0.5 animate-spin" />
        ),
      }}
      toastOptions={{
        duration: 1300,
        classNames: {
          toast:
            "group toast !bg-surface/95 dark:!bg-surface/95 !backdrop-blur-xl !text-on-surface !border !border-outline-variant/60 !shadow-xl !rounded-xl !px-3.5 !py-2.5 !gap-2.5 !font-[family-name:var(--font-body)] !text-[13px] !max-w-[330px] select-none",
          title: "!font-semibold !text-[13px] !text-on-surface !leading-tight",
          description: "!text-[12px] !text-on-surface-variant !leading-snug !mt-0.5",
          actionButton:
            "!bg-primary !text-on-primary !text-[12px] !font-medium !rounded-lg !px-2.5 !py-1 !transition-all hover:!brightness-110",
          cancelButton:
            "!bg-surface-high !text-on-surface-variant !text-[12px] !font-medium !rounded-lg !px-2.5 !py-1",
          closeButton:
            "!bg-surface-high !border-outline-variant/50 !text-outline hover:!text-on-surface !rounded-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
