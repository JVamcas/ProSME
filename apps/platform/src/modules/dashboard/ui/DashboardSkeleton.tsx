import { Skeleton } from "@/shared/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading dashboard" data-page-loading>
      <p className="sr-only" role="status">
        Loading dashboard
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="space-y-4 rounded-xl border border-brand-navy/10 p-5"
            key={index}
          >
            <Skeleton className="w-2/3" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="w-full" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </section>
  );
}
