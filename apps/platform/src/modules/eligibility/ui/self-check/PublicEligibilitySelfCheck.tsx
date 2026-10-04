"use client";

import { useState } from "react";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import type {
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckResult,
} from "../../api/PublicEligibilitySelfCheckTransport";
import { PublicEligibilitySelfCheckForm } from "./PublicEligibilitySelfCheckForm";
import { PublicEligibilitySelfCheckResult as ResultView } from "./PublicEligibilitySelfCheckResult";
import {
  useEvaluatePublicEligibilitySelfCheck,
  usePublicEligibilitySelfCheck,
} from "./usePublicEligibilitySelfCheck";

export function PublicEligibilitySelfCheck({
  applicationHref,
  backHref,
  fundingCallId,
}: {
  applicationHref?: string;
  backHref?: string;
  fundingCallId: string;
}) {
  const workspace = usePublicEligibilitySelfCheck(fundingCallId);
  const evaluation = useEvaluatePublicEligibilitySelfCheck(fundingCallId);
  const [result, setResult] = useState<PublicEligibilitySelfCheckResult | null>(
    null,
  );

  if (workspace.isPending) {
    return (
      <PortalLoadingState
        description="The current questions are being prepared."
        title="Loading eligibility check"
      />
    );
  }
  if (workspace.isError) {
    return (
      <PortalErrorState
        description={workspace.error.message}
        onAction={() => void workspace.refetch()}
        title="Eligibility self-check unavailable"
      />
    );
  }

  if (!workspace.data.questions.length) {
    return (
      <PortalErrorState
        description="This call does not currently have any self-check questions."
        title="Eligibility self-check unavailable"
      />
    );
  }

  async function evaluate(input: PublicEligibilitySelfCheckInput) {
    setResult(await evaluation.mutateAsync(input));
  }

  return (
    <div>
      {result ? (
        <ResultView
          applicationHref={applicationHref}
          onRestart={() => {
            evaluation.reset();
            setResult(null);
          }}
          result={result}
        />
      ) : (
        <PublicEligibilitySelfCheckForm
          backHref={backHref}
          error={evaluation.error}
          key={workspace.data.configurationToken}
          onSubmit={evaluate}
          pending={evaluation.isPending}
          workspace={workspace.data}
        />
      )}
    </div>
  );
}
