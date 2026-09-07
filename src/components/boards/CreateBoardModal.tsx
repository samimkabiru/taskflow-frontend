"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createBoard } from "@/services/boardService";

const ACCENT_COLORS = [
  "#6E64E0", "#A5D1B2", "#F7BC62", "#E08074", "#C5C0FF",
  "#9B6C18", "#554AC5", "#BA1A1A",
];

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreateBoard?: (data: {
    name: string;
    description: string;
    accentColor: string;
    taskPrefix: string;
  }) => Promise<void> | void;
}

export default function CreateBoardModal({ open, onClose, onCreateBoard }: CreateBoardModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [taskPrefix, setTaskPrefix] = useState("");
  const [prefixTouched, setPrefixTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
    setTaskPrefix(raw);
    setPrefixTouched(true);
  };

  const isPrefixValid = taskPrefix.length >= 2 && taskPrefix.length <= 6 && /^[A-Z]{2,6}$/.test(taskPrefix);
  const showPrefixError = prefixTouched && (!taskPrefix || !isPrefixValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefixTouched(true);
    if (!name.trim() || !isPrefixValid) return;

    const boardData = {
      name: name.trim(),
      description: description.trim(),
      accentColor,
      taskPrefix: taskPrefix.trim(),
    };

    // If caller provided an optimistic handler, delegate immediately and dismiss
    if (onCreateBoard) {
      onCreateBoard(boardData);
      setName("");
      setDescription("");
      setTaskPrefix("");
      setPrefixTouched(false);
      setAccentColor(ACCENT_COLORS[0]);
      onClose();
      return;
    }

    setLoading(true);
    try {
      await createBoard(boardData);
      toast.success(`Board "${name}" created!`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("boards-updated"));
      }
      setName("");
      setDescription("");
      setTaskPrefix("");
      setPrefixTouched(false);
      setAccentColor(ACCENT_COLORS[0]);
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create board";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-surface-lowest border-outline-variant rounded-xl max-w-md p-0 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: accentColor }} />

        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-[family-name:var(--font-heading)] text-[20px] font-semibold text-on-surface">
            Create New Board
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
          {/* Board Name */}
          <div className="space-y-1.5">
            <label className="font-[family-name:var(--font-mono)] text-[12px] text-on-surface-variant uppercase tracking-wider block">
              Board Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Marketing Launch"
              className="w-full bg-surface-lowest border border-outline-variant rounded-lg px-3 py-2.5 font-[family-name:var(--font-body)] text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors"
              required
              autoFocus
            />
          </div>

          {/* Task Prefix */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-[family-name:var(--font-mono)] text-[12px] text-on-surface-variant uppercase tracking-wider block">
                Task Prefix <span className="text-error">*</span>
              </label>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-primary font-medium">
                Preview: {taskPrefix ? `${taskPrefix}-1` : "TSK-1"}
              </span>
            </div>
            <p className="text-[12px] text-on-surface-variant font-[family-name:var(--font-body)]">
              Used to generate task IDs, like TSK-142.
            </p>
            <input
              type="text"
              value={taskPrefix}
              onChange={handlePrefixChange}
              onBlur={() => setPrefixTouched(true)}
              placeholder="e.g. MKT"
              maxLength={6}
              className={cn(
                "w-full bg-surface-lowest border rounded-lg px-3 py-2.5 font-[family-name:var(--font-mono)] text-[14px] uppercase text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none transition-colors",
                showPrefixError
                  ? "border-error focus:border-error focus:ring-1 focus:ring-error"
                  : "border-outline-variant focus:border-primary-container focus:ring-1 focus:ring-primary-container"
              )}
              required
            />
            {showPrefixError && (
              <p className="text-[12px] text-error font-[family-name:var(--font-body)]">
                Prefix must be 2–6 uppercase letters.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-[family-name:var(--font-mono)] text-[12px] text-on-surface-variant uppercase tracking-wider block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              rows={3}
              className="w-full bg-surface-lowest border border-outline-variant rounded-lg px-3 py-2.5 font-[family-name:var(--font-body)] text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors resize-none"
            />
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="font-[family-name:var(--font-mono)] text-[12px] text-on-surface-variant uppercase tracking-wider block">
              Accent Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccentColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
                    accentColor === color
                      ? "border-on-surface scale-110 shadow-sm"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-outline-variant font-[family-name:var(--font-body)] text-[14px] font-medium text-on-surface hover:bg-surface-low transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !isPrefixValid}
              className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-[family-name:var(--font-body)] text-[14px] font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>{loading ? "Creating..." : "Create Board"}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
