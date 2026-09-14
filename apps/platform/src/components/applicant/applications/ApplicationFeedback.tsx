import { CheckCircle2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClientRequestError } from "@/lib/client-http";

export function ApplicationFeedback({
  completed,
  error,
  onReload,
}: {
  completed: boolean;
  error?: Error | null;
  onReload: () => void;
}) {
  const conflict =
    error instanceof ClientRequestError && error.code === "CONFLICT";
  return (
    <>
      {error ? (
        <div
          className="mt-5 rounded-xl border border-brand-navy bg-brand-cream p-4 text-sm text-brand-navy"
          role="alert"
        >
          <p className="font-semibold">{error.message}</p>
          {conflict ? (
            <Button
              className="mt-3"
              onClick={onReload}
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Reload latest application
            </Button>
          ) : null}
        </div>
      ) : null}
      {completed ? (
        <div
          className="mt-6 flex gap-3 rounded-xl bg-brand-green/10 p-4 text-sm text-brand-navy"
          role="status"
        >
          <CheckCircle2
            aria-hidden="true"
            className="size-5 shrink-0 text-brand-green"
          />
          <p>
            <strong>Application sections complete.</strong> Documents,
            declarations, review, and submission will be added in Phase 3.4.
          </p>
        </div>
      ) : null}
    </>
  );
}
