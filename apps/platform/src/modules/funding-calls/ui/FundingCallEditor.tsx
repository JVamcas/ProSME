"use client";

import { GeneralButton } from "@/components/ui/button";
import {
  useFundingCall,
  usePreviewFundingCallReadiness,
  usePublishFundingCall,
  useUpdateFundingCall,
} from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";

export function FundingCallEditor({
  canPublish,
  canUpdate,
  id,
}: {
  canPublish: boolean;
  canUpdate: boolean;
  id: string;
}) {
  const query = useFundingCall(id);
  const publish = usePublishFundingCall(id);
  const readiness = usePreviewFundingCallReadiness(id);
  const update = useUpdateFundingCall(id);

  if (query.isPending) return <p>Loading funding call…</p>;
  if (query.error || !query.data) {
    return <p>{query.error?.message ?? "Funding call not found."}</p>;
  }

  const call = query.data;
  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-3">
        <GeneralButton
          disabled={readiness.isPending}
          onClick={() => readiness.mutate()}
          type="button"
          variant="outlineOrange"
        >
          {readiness.isPending ? "Validating…" : "Validate readiness"}
        </GeneralButton>
        {call.status === "APPROVED" && canPublish ? (
          <GeneralButton
            disabled={publish.isPending || update.isPending}
            onClick={() => publish.mutate(call.rowVersion)}
            type="button"
          >
            {publish.isPending ? "Publishing…" : "Publish funding call"}
          </GeneralButton>
        ) : null}
      </div>
      {readiness.error ? (
        <p className="text-sm text-red-700" role="alert">
          {readiness.error.message}
        </p>
      ) : null}
      {readiness.data ? (
        <section
          aria-live="polite"
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold">
            {readiness.data.ready
              ? "Ready for publication"
              : `${readiness.data.issues.length} readiness issue${readiness.data.issues.length === 1 ? "" : "s"}`}
          </h2>
          {readiness.data.issues.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {readiness.data.issues.map((issue, index) => (
                <li key={`${issue.code}-${issue.location}-${index}`}>
                  <span className="font-medium">{issue.code}</span>
                  {` — ${issue.message} (${issue.location})`}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      {publish.error ? (
        <p className="text-sm text-red-700" role="alert">
          {publish.error.message}
        </p>
      ) : null}
      <FundingCallForm
        call={call}
        disabled={
          !canUpdate
          || call.status !== "DRAFT"
          || update.isPending
          || publish.isPending
        }
        onSubmit={async (input) => {
          await update.mutateAsync({
            ...input,
            expectedRowVersion: call.rowVersion,
          });
        }}
      />
    </div>
  );
}
