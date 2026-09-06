"use client";

import { getBoards } from "./boardService";
import { getTasksForBoard } from "./taskService";
import type { Board, Task } from "@/lib/types";

export async function searchBoards(query: string): Promise<Board[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const boards = await getBoards();
  return boards.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q))
  );
}

export async function searchTasks(query: string, boardId?: string): Promise<Task[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  
  if (boardId) {
    const tasks = await getTasksForBoard(boardId);
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.shortCode.toLowerCase().includes(q)
    );
  }

  const boards = await getBoards();
  const allTasksArrays = await Promise.all(boards.map((b) => getTasksForBoard(b.id)));
  const allTasks = allTasksArrays.flat();
  return allTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.shortCode.toLowerCase().includes(q)
  );
}
