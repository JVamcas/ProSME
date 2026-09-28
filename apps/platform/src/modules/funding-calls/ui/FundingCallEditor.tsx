"use client";

import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useFundingCall,
  useUpdateFundingCall,
} from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";
import { FundingCallExceptionalActions } from "./FundingCallExceptionalActions";
import { FundingCallGovernanceActions } from "./FundingCallGovernanceActions";
import { FundingCallReadOnlyReview } from "./FundingCallReadOnlyReview";

export function FundingCallEditor({
  canApprove,
  canArchive,
  canReturn,
  canResume,
  canSubmit,
  canSuspend,
  canUpdate,
  canWithdraw,
  canWithdrawOwnRequest,
  id,
}: {
  canApprove: boolean;
  canArchive: boolean;
  canReturn: boolean;
  canResume: boolean;
  canSubmit: boolean;
  canSuspend: boolean;
  canUpdate: boolean;
  canWithdraw: boolean;
  canWithdrawOwnRequest: boolean;
  id: string;
}) {
  const query = useFundingCall(id);
  const update = useUpdateFundingCall(id);

  if (query.isPending) {
    return <PortalLoadingState description="Just a moment..." title="" />;
  }
  if (query.error) {
    return (
      <PortalErrorState
        description={query.error.message}
        title={query.error.name}
      />
    );
  }
  if (!query.data) {
    return (
      <PortalErrorState
        description="The requested funding call could not be loaded."
        title="Funding call unavailable"
      />
    );
  }

  const call = query.data;
  return (
    <div className="space-y-5">
      <section className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <span className="text-sm font-medium text-brand-navy/70">
          Lifecycle status
        </span>
        <StatusBadge status={call.status} />
      </section>
      <FundingCallGovernanceActions
        call={call}
        canApprove={canApprove}
        canReturn={canReturn}
        canSubmit={canSubmit}
        canWithdrawOwnRequest={canWithdrawOwnRequest}
      />
      <FundingCallExceptionalActions
        call={call}
        canArchive={canArchive}
        canResume={canResume}
        canSuspend={canSuspend}
        canWithdraw={canWithdraw}
      />
      {call.status === "DRAFT" ? (
        <FundingCallForm
          call={call}
          disabled={!canUpdate || update.isPending}
          onSubmit={async (input) => {
            await update.mutateAsync({
              ...input,
              expectedRowVersion: call.rowVersion,
            });
          }}
        />
      ) : <FundingCallReadOnlyReview call={call} />}
    </div>
  );
}
