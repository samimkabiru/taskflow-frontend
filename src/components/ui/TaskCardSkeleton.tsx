import { Skeleton } from "@/components/ui/skeleton";

export function TaskCardSkeleton() {
  return (
    <div className="bg-surface-lowest rounded-xl border border-outline-variant p-4 flex flex-col gap-3 relative overflow-hidden shadow-sm shrink-0">
      <div className="flex justify-between items-center w-full pl-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

export function BoardCardSkeleton() {
  return (
    <div className="rounded-xl border border-outline-variant p-5 flex flex-col justify-between h-[200px] bg-surface-lowest">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex justify-between items-center pt-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}
