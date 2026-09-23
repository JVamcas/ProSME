"use client";

import { ArrowLeft } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { ApplicationDocumentsPanel } from "@/modules/applications/ui/ApplicationDocumentsPanel";

export function ApplicationDocumentsForm({
  applicationId,
  onBack,
  onContinue,
  pending,
}: {
  applicationId: string;
  onBack?: () => void;
  onContinue: () => Promise<unknown>;
  pending: boolean;
}) {
  return (
    <div>
      <ApplicationDocumentsPanel applicationId={applicationId} />
      <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-brand-navy/10 pt-5">
        {onBack ? (
          <GeneralButton onClick={onBack} type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back
          </GeneralButton>
        ) : null}
        <GeneralButton
          disabled={pending}
          onClick={() => void onContinue().catch(() => undefined)}
          type="button"
        >
          Save and continue
        </GeneralButton>
      </div>
    </div>
  );
}
