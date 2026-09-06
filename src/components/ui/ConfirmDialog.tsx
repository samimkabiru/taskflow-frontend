"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, UserMinus, LogOut } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  icon?: React.ReactNode;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  icon,
}: ConfirmDialogProps) {
  const getActionIcon = () => {
    if (icon) return icon;
    const lowerTitle = title.toLowerCase();
    const lowerConfirm = confirmText.toLowerCase();

    if (lowerTitle.includes("remove") || lowerConfirm.includes("remove")) {
      return <UserMinus size={15} />;
    }
    if (lowerTitle.includes("log") || lowerConfirm.includes("log") || lowerTitle.includes("sign")) {
      return <LogOut size={15} />;
    }
    if (variant === "destructive" || lowerTitle.includes("delete") || lowerConfirm.includes("delete")) {
      return <Trash2 size={15} />;
    }
    return null;
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-surface-lowest border-outline-variant rounded-2xl max-w-sm p-6 space-y-4 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-4"
            >
              <DialogHeader className="flex flex-row items-center gap-3">
                {variant === "destructive" && (
                  <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-error" />
                  </div>
                )}
                <div>
                  <DialogTitle className="font-[family-name:var(--font-heading)] text-[18px] font-semibold text-on-surface">
                    {title}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <DialogDescription className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant leading-relaxed">
                {description}
              </DialogDescription>

              <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2 border-t-0 bg-transparent p-0">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCancelClick}
                  className="px-4 py-2 rounded-lg bg-surface-low text-on-surface font-[family-name:var(--font-body)] text-[14px] font-medium hover:bg-surface-high transition-colors cursor-pointer"
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirmClick}
                  className={`px-4 py-2 rounded-lg font-[family-name:var(--font-body)] text-[14px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    variant === "destructive"
                      ? "bg-error text-on-error hover:brightness-110"
                      : "bg-primary text-on-primary hover:brightness-110"
                  }`}
                >
                  {getActionIcon()}
                  <span>{confirmText}</span>
                </motion.button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
