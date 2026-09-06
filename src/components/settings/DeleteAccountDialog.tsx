"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const CONFIRMATION_PHRASE = "delete my account";

export default function DeleteAccountDialog({
  open,
  onClose,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTypedValue("");
      setLoading(false);
    }
  }, [open]);

  const isMatched = typedValue.trim().toLowerCase() === CONFIRMATION_PHRASE;

  const handleDelete = async () => {
    if (!isMatched || loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="bg-surface-lowest border-outline-variant rounded-2xl max-w-md p-6 space-y-4 overflow-hidden">
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
                <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-error" />
                </div>
                <div>
                  <DialogTitle className="font-[family-name:var(--font-heading)] text-[18px] font-semibold text-on-surface">
                    Confirm Account Deletion
                  </DialogTitle>
                </div>
              </DialogHeader>

              <DialogDescription className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant leading-relaxed space-y-2">
                <span>
                  This action is permanent and cannot be undone. All your data, workspaces, and memberships will be deleted or anonymized.
                </span>
                <span className="block pt-1 text-on-surface font-medium">
                  To confirm, type <span className="font-mono font-bold text-error">delete my account</span> below:
                </span>
              </DialogDescription>

              <div className="pt-1">
                <input
                  type="text"
                  autoFocus
                  disabled={loading}
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  placeholder="delete my account"
                  className="w-full rounded-xl px-4 py-2.5 font-mono text-[14px] text-on-surface bg-surface-lowest border border-outline-variant focus:border-error focus:ring-2 focus:ring-error/15 outline-none transition-all placeholder:text-outline/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isMatched && !loading) {
                      e.preventDefault();
                      handleDelete();
                    }
                  }}
                />
              </div>

              <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t-0 bg-transparent p-0">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-surface-low text-on-surface font-[family-name:var(--font-body)] text-[14px] font-medium hover:bg-surface-high transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!isMatched || loading}
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg font-[family-name:var(--font-body)] text-[14px] font-medium transition-all flex items-center gap-2 bg-error text-on-error hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Deleting…</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>Delete my account</span>
                    </>
                  )}
                </button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
