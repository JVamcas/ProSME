"use client";

import { useFundingCall, useUpdateFundingCall } from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";

export function FundingCallEditor({
  canUpdate,
  id,
}: {
  canUpdate: boolean;
  id: string;
}) {
  const query = useFundingCall(id);
  const update = useUpdateFundingCall(id);

  if (query.isPending) return <p>Loading funding call…</p>;
  if (query.error || !query.data) {
    return <p>{query.error?.message ?? "Funding call not found."}</p>;
  }

  const call = query.data;
  return (
    <FundingCallForm
      call={call}
      disabled={!canUpdate || call.status !== "DRAFT" || update.isPending}
      onSubmit={async (input) => {
        await update.mutateAsync({
          ...input,
          expectedRowVersion: call.rowVersion,
        });
      }}
    />
  );
}
