"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EligibilityAssessmentForm } from "./EligibilityAssessmentForm";
import { EligibilityResult } from "./EligibilityResult";
import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useEligibilityWorkspace } from "@/modules/eligibility/EligibilityHooks";
import type { EligibilityAssessmentView } from "@/modules/eligibility/EligibilityTypes";

export function EligibilityAssessment({
  fundingOpportunityId,
}: {
  fundingOpportunityId: string;
}) {
  const query = useEligibilityWorkspace(fundingOpportunityId);
  const [result, setResult] = useState<EligibilityAssessmentView | null>(null);

  if (query.isPending) {
    return (
      <PortalLoadingState
        description="The current published eligibility questions are being prepared."
        title="Loading eligibility check"
      />
    );
  }
  if (query.isError) {
    return (
      <PortalErrorState
        description={query.error.message}
        onAction={() => void query.refetch()}
        title="Eligibility check could not be loaded"
      />
    );
  }
  return (
    <section className="mx-auto max-w-4xl">
      <Link
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-navy hover:underline"
        href={`/portal/funding-opportunities/${fundingOpportunityId}`}
      >
        <ChevronLeft className="size-4 text-brand-orange" aria-hidden="true" />
        Back to opportunity
      </Link>
      <PageHeader
        className="mt-2"
        description={`Answer a few questions to confirm whether you meet the initial criteria for ${query.data.fundingOpportunity.title}.`}
        title="Check your eligibility"
      />
      {result ? (
        <EligibilityResult
          assessment={result}
          onRestart={() => setResult(null)}
        />
      ) : (
        <EligibilityAssessmentForm
          key={query.data.ruleSetVersion}
          onComplete={setResult}
          onRefresh={() => void query.refetch()}
          workspace={query.data}
        />
      )}
    </section>
  );
}
