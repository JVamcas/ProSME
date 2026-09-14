import { Save } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";

type ProfileFormActionsProps = {
  error: boolean;
  pending: boolean;
  readOnly?: boolean;
  saveLabel: string;
};

export function ProfileFormActions({
  error,
  pending,
  readOnly,
  saveLabel,
}: ProfileFormActionsProps) {
  if (readOnly) {
    return (
      <p className="mt-7 border-t border-brand-navy/15 pt-5 text-sm text-brand-navy/70">
        You have view-only access to this information.
      </p>
    );
  }

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mt-5 border-l-4 border-brand-orange bg-brand-cream p-3 text-sm font-semibold text-brand-navy"
        >
          Your changes could not be saved. Please try again.
        </p>
      ) : null}
      <div className="mt-7 flex justify-end border-t border-brand-navy/15 pt-5">
        <GeneralButton type="submit" disabled={pending}>
          <Save aria-hidden="true" className="size-4" />
          {pending ? "Saving…" : saveLabel}
        </GeneralButton>
      </div>
    </>
  );
}
