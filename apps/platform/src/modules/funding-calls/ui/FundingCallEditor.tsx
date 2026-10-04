"use client";

import { CircleDollarSign } from "lucide-react";

import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageShell } from "@/shared/ui/PageShell";
import {
  useFundingCall,
  useUpdateFundingCall,
} from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";
import { FundingCallExceptionalActions } from "./FundingCallExceptionalActions";
import { FundingCallGovernanceActions } from "./FundingCallGovernanceActions";
import { FundingCallPageActions } from "./FundingCallPageActions";
import { FundingCallReadOnlyReview } from "./FundingCallReadOnlyReview";

export function FundingCallEditor({
  canApprove,
  canArchive,
  canPublish,
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
  canPublish: boolean;
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

  const call = query.data;

  const headerActions = call ? (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="flex items-center gap-3">
        <StatusBadge status={call.status} />
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <FundingCallPageActions canPublish={canPublish} id={id} />
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
      </div>
    </div>
  ) : undefined;

  return (
    <PageShell
      actions={headerActions}
      eyebrow="Funding calls"
      icon={<CircleDollarSign />}
      title="Manage funding calls"
    >
      {query.isPending ? (
        <PortalLoadingState description="Just a moment..." title="" />
      ) : query.error ? (
        <PortalErrorState
          description={query.error.message}
          title={query.error.name}
        />
      ) : !call ? (
        <PortalErrorState
          description="The requested funding call could not be loaded."
          title="Funding call unavailable"
        />
      ) : call.status === "DRAFT" ? (
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
      ) : (
        <FundingCallReadOnlyReview call={call} />
      )}
    </PageShell>
  );
}
