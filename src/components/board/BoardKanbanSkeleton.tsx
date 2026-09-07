import { Skeleton } from "@/components/ui/skeleton";

interface KanbanCardSkeletonProps {
  hasLabels?: boolean;
  priorityColor?: string;
  hasDueDate?: boolean;
  hasComments?: boolean;
  hasAssignee?: boolean;
  isDone?: boolean;
}

function KanbanCardSkeleton({
  hasLabels = true,
  priorityColor = "bg-primary/20",
  hasDueDate = true,
  hasComments = true,
  hasAssignee = true,
  isDone = false,
}: KanbanCardSkeletonProps) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-lowest shadow-xs shrink-0 pl-3 pr-2 pt-2.5 pb-2.5 gap-1.5">
      {/* Priority left stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
          isDone ? "bg-outline-variant/40" : priorityColor
        }`}
      />

      {/* Row 1: label dots + short code + priority badge + options */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasLabels && (
            <div className="flex items-center gap-1 mr-0.5">
              <Skeleton className="w-2 h-2 rounded-full shrink-0" />
              <Skeleton className="w-2 h-2 rounded-full shrink-0 opacity-70" />
            </div>
          )}
          <Skeleton className="h-2.5 w-12 rounded shrink-0" />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isDone && (
            <Skeleton className="h-3.5 w-10 rounded-md shrink-0" />
          )}
          <Skeleton className="w-3.5 h-3.5 rounded shrink-0 opacity-50" />
        </div>
      </div>

      {/* Row 2: Title */}
      <div className="py-0.5 space-y-1">
        <Skeleton className="h-3.5 w-5/6 rounded" />
      </div>

      {/* Row 3: Meta (Due date, comment count, assignee avatar) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline-variant/20 mt-0.5">
        <div className="flex items-center gap-2">
          {hasDueDate && (
            <div className="flex items-center gap-1">
              <Skeleton className="w-2.5 h-2.5 rounded-xs" />
              <Skeleton className="h-2.5 w-11 rounded" />
            </div>
          )}
          {hasComments && (
            <div className="flex items-center gap-1">
              <Skeleton className="w-2.5 h-2.5 rounded-xs" />
              <Skeleton className="h-2.5 w-4 rounded" />
            </div>
          )}
        </div>

        {hasAssignee && (
          <Skeleton className="w-5 h-5 rounded-full shrink-0" />
        )}
      </div>
    </div>
  );
}

export default function BoardKanbanSkeleton() {
  const columns = [
    {
      name: "To Do",
      dot: "bg-slate-400/70",
      bar: "bg-slate-400/70",
      titleWidth: "w-14",
      cards: [
        { hasLabels: true, priorityColor: "bg-tertiary/40", hasDueDate: true, hasComments: true, hasAssignee: true },
        { hasLabels: false, priorityColor: "bg-secondary/40", hasDueDate: true, hasComments: false, hasAssignee: true },
        { hasLabels: true, priorityColor: "bg-error/40", hasDueDate: false, hasComments: true, hasAssignee: false },
      ],
    },
    {
      name: "In Progress",
      dot: "bg-primary/70",
      bar: "bg-primary/70",
      titleWidth: "w-20",
      cards: [
        { hasLabels: true, priorityColor: "bg-error/50", hasDueDate: true, hasComments: true, hasAssignee: true },
        { hasLabels: true, priorityColor: "bg-tertiary/40", hasDueDate: true, hasComments: true, hasAssignee: true },
      ],
    },
    {
      name: "Review",
      dot: "bg-tertiary/70",
      bar: "bg-tertiary/70",
      titleWidth: "w-14",
      cards: [
        { hasLabels: false, priorityColor: "bg-primary/40", hasDueDate: true, hasComments: false, hasAssignee: true },
        { hasLabels: true, priorityColor: "bg-secondary/40", hasDueDate: false, hasComments: true, hasAssignee: true },
      ],
    },
    {
      name: "Done",
      dot: "bg-secondary/70",
      bar: "bg-secondary/70",
      titleWidth: "w-12",
      isDone: true,
      cards: [
        { hasLabels: true, priorityColor: "bg-outline-variant/40", hasDueDate: true, hasComments: false, hasAssignee: true, isDone: true },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-background select-none">
      {/* Board Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-4 shrink-0 gap-4 bg-background border-b border-outline-variant/30">
        {/* Left: Breadcrumbs & Board Title */}
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 mb-1">
            <Skeleton className="h-3 w-12 rounded" />
            <span className="text-outline/40 text-xs">/</span>
            <Skeleton className="h-3 w-28 rounded" />
          </div>

          {/* Title row */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" />
            <Skeleton className="h-7 md:h-8 w-44 md:w-64 rounded-xl" />
          </div>
        </div>

        {/* Right: Action Skeletons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter button */}
          <Skeleton className="h-9 w-20 rounded-xl" />

          {/* Member avatars group */}
          <div className="flex -space-x-2">
            <Skeleton className="w-8 h-8 rounded-full border-2 border-background" />
            <Skeleton className="w-8 h-8 rounded-full border-2 border-background" />
            <Skeleton className="w-8 h-8 rounded-full border-2 border-background" />
            <Skeleton className="w-8 h-8 rounded-full border-2 border-background opacity-60" />
          </div>

          {/* Options button */}
          <Skeleton className="w-9 h-9 rounded-xl" />
        </div>
      </div>

      {/* Mobile Column Segmented Switcher Skeleton (md:hidden) */}
      <div className="md:hidden shrink-0 px-3 py-2 bg-surface-low/80 border-b border-outline-variant/30 overflow-x-auto custom-scrollbar flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container/70 shrink-0">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3.5 w-4 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container/50 shrink-0">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3.5 w-4 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container/50 shrink-0">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3.5 w-4 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container/50 shrink-0">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-3.5 w-4 rounded-full" />
        </div>
        <Skeleton className="h-7 w-20 rounded-xl shrink-0 border border-dashed border-outline-variant/50" />
      </div>

      {/* Kanban Board Container Skeleton */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden kanban-scroll px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-3 md:py-4 flex gap-3 md:gap-4 items-stretch snap-x snap-mandatory md:snap-none">
        {columns.map((col, idx) => (
          <div
            key={idx}
            className="w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 flex flex-col h-full min-h-0 rounded-2xl border shadow-xs relative overflow-hidden snap-center md:snap-align-none border-outline-variant/40 bg-surface-low/30"
          >
            {/* 3px Top Accent Bar */}
            <div className={`h-[3px] w-full shrink-0 ${col.bar}`} />

            {/* Column Header */}
            <div className="flex items-center justify-between px-3.5 py-3 shrink-0 border-b border-outline-variant/20 bg-surface/30 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                <Skeleton className={`h-4 ${col.titleWidth} rounded`} />
                <Skeleton className="h-4 w-5 rounded-full" />
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Skeleton className="w-6 h-6 rounded-lg" />
                <Skeleton className="w-6 h-6 rounded-lg" />
              </div>
            </div>

            {/* Task Cards Scrollable Area */}
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-hidden p-2.5">
              {col.cards.map((card, cIdx) => (
                <KanbanCardSkeleton
                  key={cIdx}
                  hasLabels={card.hasLabels}
                  priorityColor={card.priorityColor}
                  hasDueDate={card.hasDueDate}
                  hasComments={card.hasComments}
                  hasAssignee={card.hasAssignee}
                  isDone={col.isDone}
                />
              ))}

              {/* Bottom: Quick Add Task button skeleton placeholder */}
              <div className="mt-1">
                <Skeleton className="h-8 w-full rounded-xl border border-dashed border-outline-variant/40 bg-surface-high/15 shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
