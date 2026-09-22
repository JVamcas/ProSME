"use client";

import { GeneralButton } from "@/components/ui/button";
import {
  useFundingCall,
  usePublishFundingCall,
  useUpdateFundingCall,
} from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";
import { FundingCallGovernanceActions } from "./FundingCallGovernanceActions";

export function FundingCallEditor({
  canPublish,
  canApprove,
  canReturn,
  canUpdate,
  canWithdrawOwnRequest,
  id,
}: {
  canApprove: boolean;
  canPublish: boolean;
  canReturn: boolean;
  canUpdate: boolean;
  canWithdrawOwnRequest: boolean;
  id: string;
}) {
  const query = useFundingCall(id);
  const publish = usePublishFundingCall(id);
  const update = useUpdateFundingCall(id);

  if (query.isPending) return <p>Loading funding call…</p>;
  if (query.error || !query.data) {
    return <p>{query.error?.message ?? "Funding call not found."}</p>;
  }

  const call = query.data;
  return (
    <div className="space-y-5">
      {call.status === "APPROVED" && canPublish ? (
        <div className="flex justify-end gap-3">
          <GeneralButton
            disabled={publish.isPending || update.isPending}
            onClick={() => publish.mutate(call.rowVersion)}
            type="button"
          >
            {publish.isPending ? "Publishing…" : "Publish now or schedule"}
          </GeneralButton>
        </div>
      ) : null}
      {publish.error ? (
        <p className="text-sm text-red-700" role="alert">
          {publish.error.message}
        </p>
      ) : null}
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
