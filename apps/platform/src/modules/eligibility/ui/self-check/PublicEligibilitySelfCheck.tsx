"use client";

import { ChevronLeft, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
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
  backHref,
  fundingCallId,
}: {
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
      <div className="grid min-h-48 place-items-center text-brand-navy">
        <LoaderCircle className="size-7 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (workspace.isError) {
    return (
      <div className="rounded-2xl bg-brand-cream p-6" role="alert">
        <TriangleAlert className="size-7 text-brand-orange" aria-hidden />
        <h2 className="mt-4 text-xl font-bold text-brand-navy">
          Eligibility self-check unavailable
        </h2>
        <p className="mt-2 text-sm text-brand-navy/70">
          {workspace.error.message}
        </p>
        <GeneralButton
          className="mt-5"
          onClick={() => void workspace.refetch()}
        >
          Try again
        </GeneralButton>
      </div>
    );
  }

  async function evaluate(input: PublicEligibilitySelfCheckInput) {
    setResult(await evaluation.mutateAsync(input));
  }

  return (
    <div>
      {backHref ? (
        <Link
          className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-navy hover:underline"
          href={backHref}
        >
          <ChevronLeft className="size-4 text-brand-orange" aria-hidden />
          Back to funding call
        </Link>
      ) : null}
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
          Before you apply
        </p>
        <h1 className="display mt-2 text-3xl font-bold text-brand-navy sm:text-4xl">
          Check eligibility for {workspace.data.fundingCall.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-navy/70">
          Provide only the information required by this funding call’s current
          self-check rules.
        </p>
      </header>
      {result ? (
        <ResultView
          onRestart={() => {
            evaluation.reset();
            setResult(null);
          }}
          result={result}
        />
      ) : (
        <PublicEligibilitySelfCheckForm
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
