import { PageShell } from "@/shared/ui/PageShell";
import { Skeleton } from "@/shared/ui/Skeleton";

export function PortalPageSkeleton({
  title = "Opening page",
}: {
  title?: string;
}) {
  return (
    <PageShell title={title}>
      <section
        aria-busy="true"
        aria-label="Loading page content"
        data-page-loading
      >
        <p className="sr-only" role="status">
          Loading page content
        </p>
        <Skeleton className="mb-5 h-10 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="space-y-4 rounded-xl border border-brand-navy/10 p-5"
              key={index}
            >
              <Skeleton className="w-1/2" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="w-3/4" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-48 w-full" />
      </section>
    </PageShell>
  );
}
