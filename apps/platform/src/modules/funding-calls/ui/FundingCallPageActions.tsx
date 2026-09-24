"use client";

import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import {
  useFundingCall,
  usePublishFundingCall,
} from "../FundingCallHooks";

export function FundingCallPageActions({
  canPublish,
  id,
}: {
  canPublish: boolean;
  id: string;
}) {
  const query = useFundingCall(id);
  const publish = usePublishFundingCall(id);
  const call = query.data;

  function publishFundingCall() {
    if (!call) return;

    publish.mutate(
      call.rowVersion,
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => toast.success("Funding call published"),
      },
    );
  }

  if (!call) return null;

  return (
    <>
      {call.status === "DRAFT" && canPublish ? (
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
