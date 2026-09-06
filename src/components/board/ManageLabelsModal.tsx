"use client";

import { useState } from "react";
import { X, Pencil, Trash2, Plus, Check } from "lucide-react";
import type { Label } from "@/lib/types";
import { createLabel, updateLabel, deleteLabel as deleteLabelService } from "@/services/labelService";
import { toast } from "sonner";

interface ManageLabelsModalProps {
  boardId: string;
  labels: Label[];
  onClose: () => void;
  onLabelCreated?: (label: Label) => void;
  onLabelUpdated?: (label: Label) => void;
  onLabelDeleted?: (labelId: string) => void;
}

const SWATCH_COLORS = [
  "#6E64E0", // Indigo primary
  "#554AC5", // Deeper indigo
  "#3F674E", // Sage green
  "#C0583E", // Coral
  "#C48B2C", // Amber
  "#4A78A8", // Steel blue
  "#7C5DA4", // Plum
  "#2E7D6E", // Teal
  "#8B5E3C", // Warm brown
  "#5B6770", // Slate
];

export default function ManageLabelsModal({
  boardId,
  labels: initialLabels,
  onClose,
  onLabelCreated,
  onLabelUpdated,
  onLabelDeleted,
}: ManageLabelsModalProps) {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(SWATCH_COLORS[0]);

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
    setIsAdding(false);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    try {
      const updated = await updateLabel(editingId, { name: editName.trim(), color: editColor });
      setLabels((prev) =>
        prev.map((l) => (l.id === editingId ? updated : l))
      );
      onLabelUpdated?.(updated);
      setEditingId(null);
      toast.success("Label updated");
    } catch {
      toast.error("Failed to update label");
    }
  };

  const deleteLabel = async (id: string) => {
    try {
      await deleteLabelService(id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
      onLabelDeleted?.(id);
      if (editingId === id) setEditingId(null);
      toast.success("Label deleted");
    } catch {
      toast.error("Failed to delete label");
    }
  };

  const addLabel = async () => {
    if (!newName.trim()) return;
    try {
      const created = await createLabel(boardId, {
        name: newName.trim(),
        color: newColor,
      });
      setLabels((prev) => (prev.some((l) => l.id === created.id) ? prev : [...prev, created]));
      onLabelCreated?.(created);
      setNewName("");
      setNewColor(SWATCH_COLORS[0]);
      setIsAdding(false);
      toast.success("Label created");
    } catch {
      toast.error("Failed to create label");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[2px] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-lowest w-full max-w-[440px] rounded-xl shadow-[var(--tf-shadow-2)] flex flex-col max-h-[80vh] border border-outline-variant overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant shrink-0">
          <h2 className="font-[family-name:var(--font-heading)] text-[18px] font-semibold text-on-surface">
            Manage Labels
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-full p-1.5 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Labels List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {labels.length === 0 && !isAdding && (
            <div className="text-center py-8">
              <p className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant">
                No labels yet. Create your first label to organize tasks.
              </p>
            </div>
          )}

          {labels.map((label) => (
            <div key={label.id}>
              {editingId === label.id ? (
                /* Edit Mode */
                <div className="bg-surface-low rounded-lg p-3 border border-primary/30 space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-surface-lowest border border-outline-variant rounded-md px-3 py-2 font-[family-name:var(--font-body)] text-[13px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {SWATCH_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center"
                        style={{
                          backgroundColor: color,
                          borderColor: editColor === color ? "var(--color-on-surface)" : "transparent",
                        }}
                        aria-label={`Select color ${color}`}
                      >
                        {editColor === color && <Check size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant hover:bg-surface-container rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!editName.trim()}
                      className="px-3 py-1.5 bg-primary text-on-primary font-[family-name:var(--font-body)] text-[12px] font-medium rounded-md hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-surface-low transition-colors group">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="font-[family-name:var(--font-body)] text-[14px] text-on-surface font-medium">
                      {label.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(label)}
                      className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors"
                      aria-label={`Edit ${label.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteLabel(label.id)}
                      className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded transition-colors"
                      aria-label={`Delete ${label.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New Label Form */}
          {isAdding && (
            <div className="bg-surface-low rounded-lg p-3 border border-primary/30 space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Label name..."
                className="w-full bg-surface-lowest border border-outline-variant rounded-md px-3 py-2 font-[family-name:var(--font-body)] text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addLabel();
                  if (e.key === "Escape") setIsAdding(false);
                }}
              />
              <div className="flex flex-wrap gap-1.5">
                {SWATCH_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: color,
                      borderColor: newColor === color ? "var(--color-on-surface)" : "transparent",
                    }}
                    aria-label={`Select color ${color}`}
                  >
                    {newColor === color && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 font-[family-name:var(--font-body)] text-[12px] text-on-surface-variant hover:bg-surface-container rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addLabel}
                  disabled={!newName.trim()}
                  className="px-3 py-1.5 bg-primary text-on-primary font-[family-name:var(--font-body)] text-[12px] font-medium rounded-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — Add Label */}
        {!isAdding && (
          <div className="px-4 py-3 border-t border-outline-variant shrink-0">
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-primary font-[family-name:var(--font-body)] text-[13px] font-medium hover:bg-primary-fixed/20 rounded-lg transition-colors border border-dashed border-outline-variant"
            >
              <Plus size={16} />
              Add New Label
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
