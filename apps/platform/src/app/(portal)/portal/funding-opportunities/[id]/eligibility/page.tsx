import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EligibilitySelfCheckSidebar } from "@/modules/eligibility/ui/self-check/EligibilitySelfCheckSidebar";
import { PublicEligibilitySelfCheck } from "@/modules/eligibility/ui/self-check/PublicEligibilitySelfCheck";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Eligibility check" };

export default async function EligibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunityId = z.uuid().safeParse(id);
  if (!opportunityId.success) {
    notFound();
  }
  return (
    <PageShell
      backLink={(
        <Link
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-navy hover:underline"
          href={`/portal/funding-opportunities/${opportunityId.data}`}
        >
          <ChevronLeft className="size-4 text-brand-orange" aria-hidden />
          Back to funding call
        </Link>
      )}
      description="Complete this short self-check before starting your application."
      eyebrow="Funding opportunities"
      title="Eligibility check"
    >
      <div className="grid gap-10 lg:grid-cols-[27rem_minmax(0,1fr)] lg:items-start xl:gap-12">
        <EligibilitySelfCheckSidebar
          description={(
            <p>
              Answer a short set of straightforward questions. Your result
              helps you decide whether to apply now or prepare outstanding
              items first.
            </p>
          )}
        />
        <PublicEligibilitySelfCheck fundingCallId={opportunityId.data} />
      </div>
    </PageShell>
  );
}
