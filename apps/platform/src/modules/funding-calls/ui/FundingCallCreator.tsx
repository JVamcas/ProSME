"use client";

import { useRouter } from "next/navigation";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import {
  useCreateFundingCall,
  useFundingCallCreationProgress,
} from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";

export function FundingCallCreator() {
  const router = useRouter();
  const create = useCreateFundingCall();
  const draft = useFundingCallCreationProgress();

  if (draft.isPending) {
    return (
      <PortalLoadingState
        className="min-h-72"
        description="Restoring your saved progress…"
        title="Loading funding call draft"
      />
    );
  }

  if (draft.error) {
    return (
      <PortalErrorState
        actionLabel="Try again"
        description={draft.error.message}
        onAction={() => void draft.refetch()}
        title="Unable to load saved progress"
      />
    );
  }

  return (
    <FundingCallForm
      creationProgress={draft.data ?? undefined}
      disabled={create.isPending}
      onSubmit={async (input) => {
        const call = await create.mutateAsync(input);
        router.push(`/admin/funding-calls/${call.id}`);
      }}
    />
  );
}
