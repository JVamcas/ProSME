import Link from "next/link";
import type { ReactNode } from "react";
import { PageShell } from "@/shared/ui/PageShell";
import { Skeleton } from "@/shared/ui/Skeleton";

export function ApplicationSectionSkeleton({ title }: { title: string }) {
  return (
    <section
      aria-busy="true"
      aria-label={`Loading ${title}`}
      data-section-loading
      className="space-y-4 rounded-xl border border-brand-navy/10 p-5"
    >
      <p className="sr-only" role="status">
        Loading {title}
      </p>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="w-full" />
      <Skeleton className="w-2/3" />
      <Skeleton className="h-24 w-full" />
    </section>
  );
}

export function ApplicationDetailSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading application details"
      data-page-loading
      className="space-y-4"
    >
      <p className="sr-only" role="status">
        Loading application details
      </p>
      <Skeleton className="h-24 w-full" />
      <div className="rounded-xl border border-brand-navy/10 p-5">
        <Skeleton className="h-6 w-1/3" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-16 w-full" key={index} />
          ))}
        </div>
        <div className="mt-5 flex gap-4">
          <Skeleton className="w-1/4" />
          <Skeleton className="w-1/4" />
          <Skeleton className="w-1/4" />
        </div>
      </div>
      <ApplicationSectionSkeleton title="application sections" />
    </section>
  );
}

export function ApplicationDetailPageFrame({
  audience,
  children,
}: {
  audience: "staff" | "applicant";
  children: ReactNode;
}) {
  return (
    <PageShell
      title="Application details"
      backLink={
        <Link
          className="text-sm font-semibold text-brand-orange hover:underline"
          href={
            audience === "staff"
              ? "/admin/applications"
              : "/portal/applications"
          }
        >
          ← Applications
        </Link>
      }
    >
      {children}
    </PageShell>
  );
}
