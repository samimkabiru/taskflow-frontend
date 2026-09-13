import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recognizes any task list name that acts as a completion/finished column
 * (e.g. "Done", "Complete", "Completed", "Finished", "Closed", "Resolved").
 */
export function isCompletionListName(name?: string): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === "done" ||
    n === "complete" ||
    n === "completed" ||
    n === "finished" ||
    n === "closed" ||
    n === "resolved"
  );
}
