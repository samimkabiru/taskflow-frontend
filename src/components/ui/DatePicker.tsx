"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // ISO date string or "YYYY-MM-DD"
  onChange: (dateStr: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Set due date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse initial selected date or fallback to current month
  const selectedDate = value ? new Date(value) : null;
  const initialDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  // Check if overdue
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isOverdue = selectedDate && selectedDate < todayStart;

  // Formatting date display
  const formatDisplay = (d: Date | null) => {
    if (!d || isNaN(d.getTime())) return null;
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    if (target.getTime() === todayStart.getTime()) return "Today";
    if (target.getTime() === tomorrow.getTime()) return "Tomorrow";
    if (target.getTime() === yesterday.getTime()) return "Yesterday";

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const displayText = formatDisplay(selectedDate);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Select day handler
  const handleSelectDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    const picked = new Date(currentYear, currentMonth, day, 23, 59, 59);
    // Format YYYY-MM-DD or ISO
    const isoString = picked.toISOString();
    onChange(isoString);
    setOpen(false);
  };

  // Quick preset shortcuts
  const selectToday = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    onChange(d.toISOString());
    setOpen(false);
  };

  const selectTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 999);
    onChange(d.toISOString());
    setOpen(false);
  };

  const selectNextWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 999);
    onChange(d.toISOString());
    setOpen(false);
  };

  const clearDate = () => {
    onChange(undefined);
    setOpen(false);
  };

  // Generate calendar grid dates
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells: { day: number; isCurrentMonth: boolean }[] = [];

  // Previous month overflow
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    calendarCells.push({ day: d, isCurrentMonth: true });
  }

  // Next month overflow to complete 35 or 42 grid cells
  const remaining = 35 - calendarCells.length;
  const totalCells = remaining < 0 ? 42 : 35;
  const nextMonthDays = totalCells - calendarCells.length;
  for (let d = 1; d <= nextMonthDays; d++) {
    calendarCells.push({ day: d, isCurrentMonth: false });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer border select-none group",
          displayText
            ? isOverdue
              ? "bg-error/10 border-error/30 text-error hover:bg-error/15"
              : "bg-surface-low border-outline-variant/60 text-on-surface hover:bg-surface-high hover:border-outline-variant"
            : "bg-surface-low/50 border-dashed border-outline-variant text-outline hover:text-on-surface hover:border-primary/50 hover:bg-surface-low",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <CalendarIcon
          size={14}
          className={cn(
            "shrink-0",
            displayText ? (isOverdue ? "text-error" : "text-primary") : "text-outline"
          )}
        />
        <span className="truncate">{displayText || placeholder}</span>
        {displayText && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              clearDate();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                clearDate();
              }
            }}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity ml-auto cursor-pointer inline-flex items-center justify-center"
            aria-label="Clear due date"
          >
            <X size={12} />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-[270px] p-3 bg-surface">
        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-1 pb-2.5 border-b border-outline-variant/30">
          <button
            type="button"
            onClick={selectToday}
            className="py-1 px-2 rounded-lg text-[11px] font-medium font-[family-name:var(--font-body)] text-on-surface-variant hover:text-primary hover:bg-black/6 dark:hover:bg-white/10 transition-colors text-center cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={selectTomorrow}
            className="py-1 px-2 rounded-lg text-[11px] font-medium font-[family-name:var(--font-body)] text-on-surface-variant hover:text-primary hover:bg-black/6 dark:hover:bg-white/10 transition-colors text-center cursor-pointer"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={selectNextWeek}
            className="py-1 px-2 rounded-lg text-[11px] font-medium font-[family-name:var(--font-body)] text-on-surface-variant hover:text-primary hover:bg-black/6 dark:hover:bg-white/10 transition-colors text-center cursor-pointer"
          >
            Next Week
          </button>
        </div>

        {/* Month & Year Navigation Header */}
        <div className="flex items-center justify-between pt-2 pb-2 px-1">
          <span className="font-[family-name:var(--font-heading)] text-[13.5px] font-semibold text-on-surface">
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-black/6 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-black/6 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center py-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold text-outline uppercase tracking-wider">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center pt-1">
          {calendarCells.map((cell, idx) => {
            const isToday =
              cell.isCurrentMonth &&
              now.getDate() === cell.day &&
              now.getMonth() === currentMonth &&
              now.getFullYear() === currentYear;

            const isSelected =
              cell.isCurrentMonth &&
              selectedDate &&
              selectedDate.getDate() === cell.day &&
              selectedDate.getMonth() === currentMonth &&
              selectedDate.getFullYear() === currentYear;

            return (
              <button
                key={idx}
                type="button"
                disabled={!cell.isCurrentMonth}
                onClick={() => handleSelectDay(cell.day, cell.isCurrentMonth)}
                className={cn(
                  "h-7 w-7 mx-auto rounded-lg text-[12px] font-[family-name:var(--font-body)] font-medium flex items-center justify-center transition-all cursor-pointer",
                  !cell.isCurrentMonth && "text-outline/30 cursor-not-allowed",
                  cell.isCurrentMonth && !isSelected && "text-on-surface hover:bg-black/6 dark:hover:bg-white/10",
                  isToday && !isSelected && "border border-primary text-primary font-bold",
                  isSelected && "bg-primary text-on-primary font-bold shadow-xs scale-105"
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {/* Footer with Clear Option */}
        {displayText && (
          <div className="pt-2.5 mt-2 border-t border-outline-variant/30 flex justify-between items-center px-1">
            <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-outline">
              Selected: <strong className="text-on-surface font-semibold">{displayText}</strong>
            </span>
            <button
              type="button"
              onClick={clearDate}
              className="text-[11px] font-medium text-error hover:underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
