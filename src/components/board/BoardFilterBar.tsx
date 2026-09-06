"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, User, Tags, AlertTriangle, Calendar,
  ChevronDown, Check, UserX, SlidersHorizontal, RotateCcw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import type { User as UserType, Label, Priority } from "@/lib/types";

export type DueDateFilter = "ALL" | "OVERDUE" | "THIS_WEEK" | "NO_DUE_DATE";

interface BoardFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedAssignees: string[];
  onToggleAssignee: (id: string) => void;
  onClearAssignees: () => void;
  selectedLabels: string[];
  onToggleLabel: (id: string) => void;
  onClearLabels: () => void;
  selectedPriorities: Priority[];
  onTogglePriority: (p: Priority) => void;
  onClearPriorities: () => void;
  selectedDueDate: DueDateFilter;
  onDueDateChange: (d: DueDateFilter) => void;
  allUsers: UserType[];
  allLabels: Label[];
  onClearAll: () => void;
  activeFilterCount: number;
}

const PRIORITY_OPTIONS: { priority: Priority; label: string; dot: string; text: string; bg: string }[] = [
  { priority: "URGENT", label: "Urgent", dot: "bg-red-500", text: "text-red-500", bg: "bg-red-500/10 border-red-500/25" },
  { priority: "HIGH",   label: "High",   dot: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/25" },
  { priority: "MEDIUM", label: "Medium", dot: "bg-blue-500", text: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/25" },
  { priority: "LOW",    label: "Low",    dot: "bg-slate-400", text: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/25" },
];

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string; desc: string; dot: string }[] = [
  { value: "ALL",          label: "All Due Dates", desc: "No due date filter", dot: "bg-outline-variant" },
  { value: "OVERDUE",      label: "Overdue",       desc: "Past due date",      dot: "bg-error" },
  { value: "THIS_WEEK",    label: "Due This Week", desc: "Next 7 days",        dot: "bg-primary" },
  { value: "NO_DUE_DATE",  label: "No Due Date",   desc: "Unscheduled tasks",  dot: "bg-outline" },
];

export default function BoardFilterBar({
  searchQuery,
  onSearchChange,
  selectedAssignees,
  onToggleAssignee,
  onClearAssignees,
  selectedLabels,
  onToggleLabel,
  onClearLabels,
  selectedPriorities,
  onTogglePriority,
  onClearPriorities,
  selectedDueDate,
  onDueDateChange,
  allUsers,
  allLabels,
  onClearAll,
  activeFilterCount,
}: BoardFilterBarProps) {
  // Popover search queries
  const [userSearch, setUserSearch] = useState("");
  const [labelSearch, setLabelSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const filteredLabels = useMemo(() => {
    const q = labelSearch.trim().toLowerCase();
    if (!q) return allLabels;
    return allLabels.filter((l) => l.name.toLowerCase().includes(q));
  }, [allLabels, labelSearch]);

  // Labels for triggers
  const assigneeTriggerLabel = useMemo(() => {
    if (selectedAssignees.length === 0) return "Assignee";
    if (selectedAssignees.length === 1) {
      if (selectedAssignees[0] === "UNASSIGNED") return "Unassigned";
      const u = allUsers.find((user) => user.id === selectedAssignees[0]);
      return u ? u.fullName.split(" ")[0] : "1 Assignee";
    }
    return `Assignees (${selectedAssignees.length})`;
  }, [selectedAssignees, allUsers]);

  const labelTriggerLabel = useMemo(() => {
    if (selectedLabels.length === 0) return "Label";
    if (selectedLabels.length === 1) {
      const l = allLabels.find((lbl) => lbl.id === selectedLabels[0]);
      return l ? l.name : "1 Label";
    }
    return `Labels (${selectedLabels.length})`;
  }, [selectedLabels, allLabels]);

  const priorityTriggerLabel = useMemo(() => {
    if (selectedPriorities.length === 0) return "Priority";
    if (selectedPriorities.length === 1) {
      const p = PRIORITY_OPTIONS.find((opt) => opt.priority === selectedPriorities[0]);
      return p ? p.label : "1 Priority";
    }
    return `Priorities (${selectedPriorities.length})`;
  }, [selectedPriorities]);

  const dueDateTriggerLabel = useMemo(() => {
    const d = DUE_DATE_OPTIONS.find((opt) => opt.value === selectedDueDate);
    return d && d.value !== "ALL" ? d.label : "Due Date";
  }, [selectedDueDate]);

  return (
    <div className="shrink-0 px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-2.5 bg-surface-low/90 backdrop-blur-md border-b border-outline-variant/30 flex flex-col gap-2 transition-all">
      {/* ─── Top Control Row ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Keyword Search Input */}
        <div className="relative flex items-center flex-1 min-w-[200px] max-w-xs">
          <Search size={13.5} className="absolute left-3 text-outline pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter tasks by keyword..."
            className="w-full bg-surface-lowest border border-outline-variant/60 rounded-xl pl-8.5 pr-7 py-1.5 font-[family-name:var(--font-body)] text-[12.5px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 p-0.5 text-outline hover:text-on-surface rounded-md transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-outline-variant/30 hidden sm:block" />

        {/* ─── Assignee Filter Popover ────────────────────────── */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-[family-name:var(--font-body)] transition-all cursor-pointer shadow-2xs",
              selectedAssignees.length > 0
                ? "bg-primary-container/60 text-on-primary-container border-primary/30 font-semibold"
                : "bg-surface-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-high border-outline-variant/60 font-medium"
            )}
          >
            <User size={13} className={selectedAssignees.length > 0 ? "text-primary" : "text-outline"} />
            <span className="truncate max-w-[130px]">{assigneeTriggerLabel}</span>
            <ChevronDown size={11} className="opacity-60 shrink-0 ml-0.5" />
          </PopoverTrigger>

          <PopoverContent className="w-64 p-0 bg-surface-lowest border border-outline-variant/60 shadow-xl rounded-2xl overflow-hidden">
            <div className="p-2 border-b border-outline-variant/30 bg-surface/30">
              <div className="relative flex items-center">
                <Search size={12.5} className="absolute left-2.5 text-outline pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full bg-surface-low border border-outline-variant/50 rounded-lg pl-7 pr-6 py-1 text-[11.5px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch("")}
                    className="absolute right-1.5 p-0.5 text-outline hover:text-on-surface"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
              {/* Unassigned Option */}
              <button
                type="button"
                onClick={() => onToggleAssignee("UNASSIGNED")}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] font-medium transition-colors text-left cursor-pointer",
                  selectedAssignees.includes("UNASSIGNED")
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-surface-low text-on-surface"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-surface-low border border-outline-variant/40 flex items-center justify-center text-outline shrink-0">
                    <UserX size={11} />
                  </div>
                  <span className="truncate">Unassigned</span>
                </div>
                {selectedAssignees.includes("UNASSIGNED") && <Check size={13} className="text-primary shrink-0" />}
              </button>

              {filteredUsers.map((u) => {
                const isSelected = selectedAssignees.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onToggleAssignee(u.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] font-medium transition-colors text-left cursor-pointer",
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-low text-on-surface"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        userId={u.id}
                        fullName={u.fullName}
                        avatarUrl={u.avatarUrl}
                        size={20}
                        rounded="full"
                        className="shrink-0"
                      />
                      <span className="truncate">{u.fullName}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="py-4 text-center text-[11.5px] text-outline">
                  No members found
                </div>
              )}
            </div>

            {selectedAssignees.length > 0 && (
              <div className="p-1.5 border-t border-outline-variant/30 bg-surface/30 flex justify-end">
                <button
                  type="button"
                  onClick={onClearAssignees}
                  className="text-[11px] text-primary hover:underline px-2 py-0.5 font-medium cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* ─── Label Filter Popover ───────────────────────────── */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-[family-name:var(--font-body)] transition-all cursor-pointer shadow-2xs",
              selectedLabels.length > 0
                ? "bg-secondary-container/60 text-on-secondary-container border-secondary/30 font-semibold"
                : "bg-surface-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-high border-outline-variant/60 font-medium"
            )}
          >
            <Tags size={13} className={selectedLabels.length > 0 ? "text-secondary" : "text-outline"} />
            <span className="truncate max-w-[130px]">{labelTriggerLabel}</span>
            <ChevronDown size={11} className="opacity-60 shrink-0 ml-0.5" />
          </PopoverTrigger>

          <PopoverContent className="w-60 p-0 bg-surface-lowest border border-outline-variant/60 shadow-xl rounded-2xl overflow-hidden">
            <div className="p-2 border-b border-outline-variant/30 bg-surface/30">
              <div className="relative flex items-center">
                <Search size={12.5} className="absolute left-2.5 text-outline pointer-events-none" />
                <input
                  type="text"
                  value={labelSearch}
                  onChange={(e) => setLabelSearch(e.target.value)}
                  placeholder="Search labels..."
                  className="w-full bg-surface-low border border-outline-variant/50 rounded-lg pl-7 pr-6 py-1 text-[11.5px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                />
                {labelSearch && (
                  <button
                    type="button"
                    onClick={() => setLabelSearch("")}
                    className="absolute right-1.5 p-0.5 text-outline hover:text-on-surface"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
              {filteredLabels.map((l) => {
                const isSelected = selectedLabels.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onToggleLabel(l.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] font-medium transition-colors text-left cursor-pointer",
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-low text-on-surface"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="truncate">{l.name}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}

              {filteredLabels.length === 0 && (
                <div className="py-4 text-center text-[11.5px] text-outline">
                  No labels found
                </div>
              )}
            </div>

            {selectedLabels.length > 0 && (
              <div className="p-1.5 border-t border-outline-variant/30 bg-surface/30 flex justify-end">
                <button
                  type="button"
                  onClick={onClearLabels}
                  className="text-[11px] text-primary hover:underline px-2 py-0.5 font-medium cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* ─── Priority Filter Popover ────────────────────────── */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-[family-name:var(--font-body)] transition-all cursor-pointer shadow-2xs",
              selectedPriorities.length > 0
                ? "bg-tertiary-container/60 text-on-tertiary-container border-tertiary/30 font-semibold"
                : "bg-surface-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-high border-outline-variant/60 font-medium"
            )}
          >
            <AlertTriangle size={13} className={selectedPriorities.length > 0 ? "text-tertiary" : "text-outline"} />
            <span className="truncate max-w-[130px]">{priorityTriggerLabel}</span>
            <ChevronDown size={11} className="opacity-60 shrink-0 ml-0.5" />
          </PopoverTrigger>

          <PopoverContent className="w-48 p-1 bg-surface-lowest border border-outline-variant/60 shadow-xl rounded-2xl">
            <div className="space-y-0.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = selectedPriorities.includes(opt.priority);
                return (
                  <button
                    key={opt.priority}
                    type="button"
                    onClick={() => onTogglePriority(opt.priority)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors text-left cursor-pointer",
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-low text-on-surface"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", opt.dot)} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            {selectedPriorities.length > 0 && (
              <div className="p-1 mt-1 border-t border-outline-variant/30 flex justify-end">
                <button
                  type="button"
                  onClick={onClearPriorities}
                  className="text-[11px] text-primary hover:underline px-2 py-0.5 font-medium cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* ─── Due Date Filter Popover ────────────────────────── */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-[family-name:var(--font-body)] transition-all cursor-pointer shadow-2xs",
              selectedDueDate !== "ALL"
                ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                : "bg-surface-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-high border-outline-variant/60 font-medium"
            )}
          >
            <Calendar size={13} className={selectedDueDate !== "ALL" ? "text-primary" : "text-outline"} />
            <span className="truncate max-w-[130px]">{dueDateTriggerLabel}</span>
            <ChevronDown size={11} className="opacity-60 shrink-0 ml-0.5" />
          </PopoverTrigger>

          <PopoverContent className="w-52 p-1 bg-surface-lowest border border-outline-variant/60 shadow-xl rounded-2xl">
            <div className="space-y-0.5">
              {DUE_DATE_OPTIONS.map((opt) => {
                const isSelected = selectedDueDate === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onDueDateChange(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors text-left cursor-pointer",
                      isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-surface-low text-on-surface"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", opt.dot)} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Button */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-[11.5px] font-[family-name:var(--font-body)] font-medium text-error hover:text-error/80 px-2 py-1 rounded-lg hover:bg-error-container/20 transition-colors ml-auto cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* ─── Active Filter Tags Sub-Row ──────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-outline-variant/20">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-outline uppercase tracking-wider mr-0.5">
            Active:
          </span>

          {/* Keyword Pill */}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-on-surface text-[11px] font-medium border border-outline-variant/40 shadow-2xs">
              <Search size={10} className="text-outline" />
              <span>&ldquo;{searchQuery}&rdquo;</span>
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="hover:text-error transition-colors ml-0.5 cursor-pointer"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {/* Assignee Pills */}
          {selectedAssignees.map((id) => {
            if (id === "UNASSIGNED") {
              return (
                <span
                  key="unassigned"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container/40 text-on-primary-container text-[11px] font-medium border border-primary/25 shadow-2xs"
                >
                  <UserX size={10} className="text-primary" />
                  <span>Unassigned</span>
                  <button
                    type="button"
                    onClick={() => onToggleAssignee("UNASSIGNED")}
                    className="hover:text-error transition-colors ml-0.5 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            }
            const u = allUsers.find((user) => user.id === id);
            if (!u) return null;
            return (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-container/40 text-on-primary-container text-[11px] font-medium border border-primary/25 shadow-2xs"
              >
                <User size={10} className="text-primary" />
                <span>{u.fullName}</span>
                <button
                  type="button"
                  onClick={() => onToggleAssignee(u.id)}
                  className="hover:text-error transition-colors ml-0.5 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}

          {/* Label Pills */}
          {selectedLabels.map((id) => {
            const l = allLabels.find((lbl) => lbl.id === id);
            if (!l) return null;
            return (
              <span
                key={l.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border shadow-2xs"
                style={{
                  backgroundColor: `${l.color}15`,
                  borderColor: `${l.color}40`,
                  color: l.color,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                <span>{l.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleLabel(l.id)}
                  className="hover:opacity-70 transition-opacity ml-0.5 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}

          {/* Priority Pills */}
          {selectedPriorities.map((p) => {
            const opt = PRIORITY_OPTIONS.find((o) => o.priority === p);
            if (!opt) return null;
            return (
              <span
                key={p}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border shadow-2xs",
                  opt.bg,
                  opt.text
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", opt.dot)} />
                <span>{opt.label}</span>
                <button
                  type="button"
                  onClick={() => onTogglePriority(p)}
                  className="hover:opacity-70 transition-opacity ml-0.5 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}

          {/* Due Date Pill */}
          {selectedDueDate !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-on-surface text-[11px] font-medium border border-outline-variant/40 shadow-2xs">
              <Calendar size={10} className="text-primary" />
              <span>{dueDateTriggerLabel}</span>
              <button
                type="button"
                onClick={() => onDueDateChange("ALL")}
                className="hover:text-error transition-colors ml-0.5 cursor-pointer"
              >
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
