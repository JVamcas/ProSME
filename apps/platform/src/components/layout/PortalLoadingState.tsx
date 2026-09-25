import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type PortalLoadingStateProps = {
  className?: string;
  description: React.ReactNode;
  title: React.ReactNode;
};

export function PortalLoadingState({
  className,
  description,
  title,
}: PortalLoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex min-h-[calc(100dvh-80px)] items-center justify-center px-4",
        className,
      )}
      role="status"
    >
      <div className="flex w-full max-w-lg items-center gap-4 rounded-2xl bg-slate-50 p-6">
        <LoaderCircle
          aria-hidden="true"
          className="size-6 shrink-0 animate-spin text-brand-orange"
        />

        <div>
          <p className="font-bold text-brand-navy">{title}</p>
          <p className="mt-1 text-sm text-brand-navy/70">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}