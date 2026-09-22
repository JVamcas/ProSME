"use client";

import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import {
  useChangeFundingCallGovernanceStatus,
  useFundingCall,
  usePreviewFundingCallReadiness,
} from "../FundingCallHooks";

export function FundingCallPageActions({
  canSubmit,
  id,
}: {
  canSubmit: boolean;
  id: string;
}) {
  const query = useFundingCall(id);
  const governance = useChangeFundingCallGovernanceStatus(id);
  const readiness = usePreviewFundingCallReadiness(id);
  const call = query.data;

  function validateReadiness() {
    readiness.mutate(undefined, {
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => {
        if (result.ready) {
          toast.success("Ready for publication");
          return;
        }

        const issueCount = result.issues.length;
        toast.error(
          `${issueCount} readiness issue${issueCount === 1 ? "" : "s"}`,
          {
            description: (
              <ul className="list-disc space-y-1 pl-4">
                {result.issues.map((issue, index) => (
                  <li key={`${issue.code}-${issue.location}-${index}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            ),
            duration: 8_000,
          },
        );
      },
    });
  }

  function submitForApproval() {
    if (!call) return;

    governance.mutate(
      {
        command: "SUBMIT_FOR_APPROVAL",
        expectedRowVersion: call.rowVersion,
      },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => toast.success("Funding call submitted for approval"),
      },
    );
  }

  if (!call) return null;

  return (
    <>
      {call.status === "DRAFT" && canSubmit ? (
        <GeneralButton
          disabled={governance.isPending}
          onClick={submitForApproval}
          type="button"
          size={"compact"}
        >
          {governance.isPending ? "Submitting…" : "Submit for approval"}
        </GeneralButton>
      ) : null}
    </>
  );
}
