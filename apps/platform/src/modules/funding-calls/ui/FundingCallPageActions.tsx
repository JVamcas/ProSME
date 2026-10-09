"use client";

import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import type { FundingCallActionRenderer } from "./FundingCallActionTypes";
import { useFundingCall, usePublishFundingCall } from "../FundingCallHooks";

export function FundingCallPageActions({
  canPublish,
  id,
  renderActions,
}: {
  canPublish: boolean;
  id: string;
  renderActions?: FundingCallActionRenderer;
}) {
  const query = useFundingCall(id);
  const publish = usePublishFundingCall(id);
  const call = query.data;

  function publishFundingCall() {
    if (!call) return;

    publish.mutate(call.rowVersion, {
      onError: (error) => toast.error(error.message),
      onSuccess: () => toast.success("Funding call published"),
    });
  }

  if (!call) return null;

  if (renderActions) {
    return renderActions(
      call.status === "APPROVED" && canPublish
        ? [
            {
              id: "publish",
              label: "Publish",
              disabled: publish.isPending,
              onAction: publishFundingCall,
            },
          ]
        : [],
    );
  }

  return (
    <>
      {call.status === "APPROVED" && canPublish ? (
        <GeneralButton
          disabled={publish.isPending}
          onClick={publishFundingCall}
          type="button"
          size="compact"
        >
          {publish.isPending ? "Publishing…" : "Publish"}
        </GeneralButton>
      ) : null}
    </>
  );
}
