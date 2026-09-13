import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProfileFormLoading() {
  return (
    <div
      role="status"
      className="mt-6 flex min-h-48 items-center justify-center rounded-2xl border border-brand-navy/15 bg-brand-white"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-6 animate-spin text-brand-orange"
      />
      <span className="ml-3 text-sm font-semibold text-brand-navy">
        Loading profile…
      </span>
    </div>
  );
}

export function ProfileFormError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-navy bg-brand-cream p-5 text-sm text-brand-navy"
    >
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-brand-orange"
      />
      <div>
        <p className="font-semibold">The profile could not be loaded.</p>
        <p className="mt-1">Check your connection, then try again.</p>
        <Button className="mt-4" onClick={onRetry} size="sm" type="button">
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
