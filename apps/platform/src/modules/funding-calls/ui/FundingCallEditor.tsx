"use client";

import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import {
  useFundingCall,
  useUpdateFundingCall,
} from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";
import { FundingCallGovernanceActions } from "./FundingCallGovernanceActions";
import { PortalErrorState } from "@/components/layout/PortalErrorState";

export function FundingCallEditor({
  canApprove,
  canReturn,
  canUpdate,
  canWithdrawOwnRequest,
  id,
}: {
  canApprove: boolean;
  canReturn: boolean;
  canUpdate: boolean;
  canWithdrawOwnRequest: boolean;
  id: string;
}) {
  const query = useFundingCall(id);
  const update = useUpdateFundingCall(id);

  if (query.isPending) return
  <PortalLoadingState title="" description="Just a moment..." />
  if (query.error || !query.data) {
    return <PortalErrorState title={query.error.name} description={query.error.message} />
  }

  const call = query.data;
  return (
    <div className="space-y-5">
      <FundingCallGovernanceActions
        call={call}
        canApprove={canApprove}
        canReturn={canReturn}
        canWithdrawOwnRequest={canWithdrawOwnRequest}
      />
      <FundingCallForm
        call={call}
        disabled={
          !canUpdate
          || call.status !== "DRAFT"
          || update.isPending
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
