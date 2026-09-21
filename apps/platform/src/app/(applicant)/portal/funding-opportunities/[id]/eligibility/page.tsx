import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PublicEligibilitySelfCheck } from "@/modules/eligibility/ui/self-check/PublicEligibilitySelfCheck";

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
    <section className="mx-auto max-w-4xl">
      <PublicEligibilitySelfCheck
        backHref={`/portal/funding-opportunities/${opportunityId.data}`}
        fundingCallId={opportunityId.data}
      />
    </section>
  );
}
