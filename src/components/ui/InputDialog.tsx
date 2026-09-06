"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface InputDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  submitText?: string;
  cancelText?: string;
}

export default function InputDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  placeholder = "Enter text...",
  initialValue = "",
  submitText = "Save",
  cancelText = "Cancel",
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, open]);

  const trimmed = value.trim();
  const trimmedInitial = initialValue.trim();
  const isDirty = trimmedInitial ? trimmed !== trimmedInitial : trimmed.length > 0;
  const canSubmit = trimmed.length > 0 && isDirty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSubmit) return;
    onSubmit(trimmed);
    onClose();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
              <DialogHeader>
                <DialogTitle className="font-[family-name:var(--font-heading)] text-[18px] font-semibold text-on-surface">
                  {title}
                </DialogTitle>
              </DialogHeader>

              {description && (
                <p className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant">
                  {description}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-surface-low border border-outline-variant rounded-lg px-3 py-2.5 font-[family-name:var(--font-body)] text-[14px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />

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
                    type="submit"
                    whileTap={canSubmit ? { scale: 0.97 } : undefined}
                    disabled={!canSubmit}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary font-[family-name:var(--font-body)] text-[14px] font-medium hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 cursor-pointer"
                  >
                    {submitText}
                  </motion.button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
