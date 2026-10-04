"use client";

import { GeneralButton } from "@/components/ui/button";

export function WorkflowReviewSaveStatus({
  invalid,
  error,
  saving,
  pending,
  hasSavedReview,
  onRetry,
}: {
  invalid: boolean;
  error: Error | null;
  saving: boolean;
  pending: boolean;
  hasSavedReview: boolean;
  onRetry: () => void;
}) {
  let message = "No review changes yet";
  if (hasSavedReview) message = "Review saved";
  if (pending) message = "Autosave pending";
  if (saving) message = "Saving review…";
  if (error) message = "Review save failed";
  if (invalid) message = "Correct review fields before saving";

  return (
    <>
      <div className="flex items-center gap-3 text-sm text-brand-navy/65">
        <span aria-live="polite">{message}</span>
        {error ? (
          <GeneralButton onClick={onRetry} type="button" variant="outline">
            Retry save
          </GeneralButton>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error.message}
        </p>
      ) : null}
    </>
  );
}
