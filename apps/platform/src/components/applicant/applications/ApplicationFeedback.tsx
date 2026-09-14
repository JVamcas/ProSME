import { RefreshCw } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { ClientRequestError } from "@/lib/client-http";

export function ApplicationFeedback({
  error,
  onReload,
}: {
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
            <GeneralButton
              className="mt-3"
              onClick={onReload}
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Reload latest application
            </GeneralButton>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
