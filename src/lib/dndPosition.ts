/**
 * Calculates a new fractional position for a task or list inserted at targetIndex.
 * Follows the project mathematical specification:
 * - Dropped into an empty list: 1000
 * - Dropped at the very top/start: firstItem.position - 1000
 * - Dropped at the very bottom/end: lastItem.position + 1000
 * - Dropped between two existing items: (pA + pB) / 2
 *
 * @param items - Array of existing items in the target container sorted by position ascending,
 *                EXCLUDING the item being moved if it was already in this container.
 * @param targetIndex - The index (0-based) where the item will sit in the target container.
 */
export function calculateNewPosition(
  items: Array<{ position: number }>,
  targetIndex: number
): number {
  if (items.length === 0) {
    return 1000;
  }

  if (targetIndex <= 0) {
    return items[0].position - 1000;
  }

  if (targetIndex >= items.length) {
    return items[items.length - 1].position + 1000;
  }

  const prevPosition = items[targetIndex - 1].position;
  const nextPosition = items[targetIndex].position;

  return (prevPosition + nextPosition) / 2;
}
