"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, Calendar, User as UserIcon, Tags, ChevronDown, ChevronUp, Send, Check, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createTask } from "@/services/taskService";
import { getBoardMembers } from "@/services/boardService";
import { getLabelsForBoard, assignLabelsToTask } from "@/services/labelService";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DatePicker from "@/components/ui/DatePicker";
import UserAvatar from "@/components/ui/UserAvatar";
import type { Priority, User, Label, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface QuickAddTaskProps {
  listId: string;
  boardId?: string;
  listName?: string;
  onCancel: () => void;
  onAdded: (createdTask?: Task) => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "LOW",    label: "Low",    color: "text-secondary  bg-secondary/10  border-secondary/30"  },
  { value: "MEDIUM", label: "Med",    color: "text-tertiary   bg-tertiary/10   border-tertiary/30"   },
  { value: "HIGH",   label: "High",   color: "text-error      bg-error/10      border-error/30"      },
  { value: "URGENT", label: "Urgent", color: "text-error      bg-error/20      border-error/50 font-bold" },
];

export default function QuickAddTask({
  listId, boardId = "", listName, onCancel, onAdded,
}: QuickAddTaskProps) {
  const [title,           setTitle]           = useState("");
  const [showMore,        setShowMore]        = useState(false);
  const [dueDate,         setDueDate]         = useState("");
  const [assigneeId,      setAssigneeId]      = useState("");
  const [assigneeSearch,  setAssigneeSearch]  = useState("");
  const [priority,        setPriority]        = useState<Priority>("MEDIUM");
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [users,           setUsers]           = useState<User[]>([]);
  const [labels,          setLabels]          = useState<Label[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (boardId) {
      getBoardMembers(boardId).then(members => setUsers(members.map(m => m.user))).catch(() => {});
      getLabelsForBoard(boardId).then(setLabels).catch(() => {});
    }
  }, [boardId]);

  const selectedUser = users.find(u => u.id === assigneeId);

  // Filtered users for dropdown search
  const filteredUsers = useMemo(() => {
    if (!assigneeSearch.trim()) return users;
    const q = assigneeSearch.toLowerCase();
    return users.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, assigneeSearch]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await createTask({
        listId,
        title: title.trim(),
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
        priority,
      });
      let finalTask = created;
      if (selectedLabelId) {
        try {
          await assignLabelsToTask(created.id, [selectedLabelId]);
          const assignedLabel = labels.find((l) => l.id === selectedLabelId);
          finalTask = {
            ...created,
            labelIds: [selectedLabelId],
            labels: assignedLabel ? [assignedLabel] : [],
          };
        } catch {}
      }
      onAdded(finalTask);
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { onCancel(); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const resize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="bg-surface-lowest rounded-xl border border-primary/40 shadow-md overflow-hidden"
    >
      {/* Title input area */}
      <div className="px-3 pt-3 pb-1">
        <textarea
          ref={inputRef}
          value={title}
          onChange={e => { setTitle(e.target.value); resize(); }}
          onKeyDown={handleKeyDown}
          placeholder={listName ? `Add to ${listName}…` : "Task title…"}
          rows={1}
          className="w-full bg-transparent border-none font-[family-name:var(--font-body)] text-[13.5px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 resize-none leading-snug min-h-[28px] max-h-[120px]"
        />
      </div>

      {/* Priority picker — always visible, compact */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {PRIORITIES.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPriority(p.value)}
            className={cn(
              "font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded-md border transition-all cursor-pointer",
              priority === p.value
                ? p.color + " opacity-100"
                : "text-outline border-outline-variant/40 bg-transparent opacity-60 hover:opacity-100"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-outline-variant/30 px-3 py-3 flex flex-col gap-3">

              {/* Due Date (Using custom DatePicker) */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant shrink-0">
                  <Calendar size={12} /> Due date
                </label>
                <DatePicker
                  value={dueDate}
                  onChange={date => setDueDate(date || "")}
                  placeholder="Select date"
                  className="py-1 px-2 text-[12px] h-7"
                />
              </div>

              {/* Assignee (Searchable Avatar Dropdown) */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant shrink-0">
                  <UserIcon size={12} /> Assignee
                </label>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface-low border border-outline-variant/60 hover:bg-surface-high hover:border-outline-variant text-[12px] font-[family-name:var(--font-body)] text-on-surface transition-all cursor-pointer shadow-2xs max-w-[200px]">
                    {selectedUser ? (
                      <>
                        <UserAvatar
                          userId={selectedUser.id}
                          fullName={selectedUser.fullName}
                          avatarUrl={selectedUser.avatarUrl}
                          size={16}
                          rounded="full"
                          className="shrink-0"
                        />
                        <span className="truncate">{selectedUser.fullName}</span>
                      </>
                    ) : (
                      <>
                        <UserIcon size={12} className="text-outline shrink-0" />
                        <span className="text-outline">Unassigned</span>
                      </>
                    )}
                    <ChevronDown size={11} className="text-outline shrink-0 ml-auto opacity-60" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56 p-1.5 bg-surface rounded-xl border border-outline-variant/50 shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
                    {/* Search filter if more than 4 users */}
                    {users.length > 4 && (
                      <div className="relative px-1 pb-1.5 mb-1 border-b border-outline-variant/20">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" />
                        <input
                          type="text"
                          value={assigneeSearch}
                          onChange={e => setAssigneeSearch(e.target.value)}
                          placeholder="Search members…"
                          className="w-full bg-surface-low border border-outline-variant/40 rounded-lg py-1 pl-6 pr-2 font-[family-name:var(--font-body)] text-[11.5px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Unassign Option */}
                    <DropdownMenuItem
                      onClick={() => setAssigneeId("")}
                      className="flex items-center justify-between cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px]"
                    >
                      <div className="flex items-center gap-2 text-outline">
                        <UserIcon size={13} />
                        <span>Unassigned</span>
                      </div>
                      {!assigneeId && <Check size={13} className="text-primary" />}
                    </DropdownMenuItem>

                    <div className="h-px bg-outline-variant/20 my-1" />

                    {/* Members List with Round Avatar Images */}
                    {filteredUsers.length === 0 ? (
                      <div className="p-2 text-center text-outline text-[11px] italic">
                        No members found
                      </div>
                    ) : (
                      filteredUsers.map(u => {
                        const isSelected = assigneeId === u.id;
                        return (
                          <DropdownMenuItem
                            key={u.id}
                            onClick={() => setAssigneeId(u.id)}
                            className="flex items-center justify-between cursor-pointer px-2.5 py-1.5 rounded-lg text-[12px]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <UserAvatar
                                userId={u.id}
                                fullName={u.fullName}
                                avatarUrl={u.avatarUrl}
                                size={20}
                                rounded="full"
                                className="shrink-0 shadow-2xs"
                              />
                              <span className="truncate font-medium text-on-surface">{u.fullName}</span>
                            </div>
                            {isSelected && <Check size={13} className="text-primary shrink-0 ml-1" />}
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Labels */}
              {labels.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] text-on-surface-variant shrink-0">
                    <Tags size={12} /> Label
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {labels.map(l => (
                      <SimpleTooltip key={l.id} content={l.name}>
                        <button
                          type="button"
                          onClick={() => setSelectedLabelId(selectedLabelId === l.id ? "" : l.id)}
                          className={cn(
                            "w-5 h-5 rounded border-2 transition-all cursor-pointer",
                            selectedLabelId === l.id
                              ? "border-on-surface ring-2 ring-primary/25 scale-110"
                              : "border-transparent opacity-60 hover:opacity-100"
                          )}
                          style={{ backgroundColor: l.color }}
                        />
                      </SimpleTooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-outline-variant/30 bg-surface-low/40">
        <div className="flex items-center gap-1">
          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
          {/* Toggle details */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1 font-[family-name:var(--font-body)] text-[11px] text-on-surface-variant hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-surface-container cursor-pointer"
          >
            {showMore ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{showMore ? "Less" : "Details"}</span>
          </button>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-[family-name:var(--font-body)] text-[12px] font-semibold transition-all cursor-pointer",
            title.trim()
              ? "bg-primary text-on-primary hover:brightness-110 active:scale-95 shadow-xs"
              : "bg-surface-container text-outline cursor-not-allowed"
          )}
        >
          <Send size={12} />
          {isSubmitting ? "Adding…" : "Add task"}
        </button>
      </div>
    </motion.div>
  );
}
