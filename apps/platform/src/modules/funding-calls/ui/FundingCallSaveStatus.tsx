"use client";

import { GeneralButton } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/client-http";
import type { FundingCallSaveStatus } from "./useFundingCallCreationAutosave";

const labels: Record<FundingCallSaveStatus, string> = {
  conflict: "Draft changed in another session. Reload to continue.",
  failed: "Autosave failed.",
  offline: "Offline — changes will save after reconnecting.",
  saved: "Changes saved",
  saving: "Saving changes…",
};

export function FundingCallSaveStatus({
  enabled,
  error,
  onRetry,
  status,
}: {
  enabled: boolean;
  error: unknown;
  onRetry: () => void;
  status: FundingCallSaveStatus;
}) {
  if (!enabled) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-brand-navy/65">
      <span aria-live="polite" role="status">
        {labels[status]}
      </span>
      {status === "failed" ? (
        <GeneralButton onClick={onRetry} size="compact" type="button" variant="outline">
          Retry
        </GeneralButton>
      ) : null}
      {status === "failed" && error ? (
        <span className="sr-only">{getErrorMessage(error)}</span>
      ) : null}
    </div>
  );
}
