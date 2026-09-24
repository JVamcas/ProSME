"use client";

import { useRouter } from "next/navigation";

import { useCreateFundingCall } from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";

export function FundingCallCreator() {
  const router = useRouter();
  const create = useCreateFundingCall();

  return (
    <FundingCallForm
      disabled={create.isPending}
      onSubmit={async (input) => {
        const call = await create.mutateAsync(input);
        router.push(`/admin/funding-calls/${call.id}`);
      }}
    />
  );
}
