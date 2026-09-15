import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { GeneralButton } from "@/components/ui/button";
import type { ApplicationSubmission } from "@/modules/applications/ApplicationTypes";

export function ApplicationSubmissionConfirmation({
  submission,
}: {
  submission: ApplicationSubmission;
}) {
  return (
    <div className="mx-auto max-w-2xl py-8 text-center">
      <CheckCircle2
        aria-hidden="true"
        className="mx-auto size-14 text-brand-green"
      />
      <h2 className="mt-5 text-2xl font-bold text-brand-navy">
        Application submitted
      </h2>
      <p className="mt-3 text-brand-navy/70">
        Your application is now with the programme team. A confirmation has
        been queued for delivery.
      </p>
      <div className="mx-auto mt-6 rounded-xl bg-brand-navy/5 px-5 py-4">
        <span className="block text-sm text-brand-navy/60">
          Application reference
        </span>
        <strong className="mt-1 block text-xl tracking-wide text-brand-navy">
          {submission.reference}
        </strong>
      </div>
      <GeneralButton asChild className="mt-7">
        <Link href="/portal/applications">View my applications</Link>
      </GeneralButton>
    </div>
  );
}
