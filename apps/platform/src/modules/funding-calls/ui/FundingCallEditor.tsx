"use client";

import { FundingCallVersionsPanel } from "./FundingCallVersionsPanel";
import { CircleDollarSign } from "lucide-react";

import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageShell } from "@/shared/ui/PageShell";
import { useFundingCall, useUpdateFundingCall } from "../FundingCallHooks";
import { FundingCallForm } from "./FundingCallForm";
import { FundingCallHeaderActions } from "./FundingCallHeaderActions";
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
  canWithdrawForAmendment,
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
  canWithdrawForAmendment: boolean;
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
      <FundingCallHeaderActions
        call={call}
        canApprove={canApprove}
        canArchive={canArchive}
        canPublish={canPublish}
        canReturn={canReturn}
        canResume={canResume}
        canSubmit={canSubmit}
        canSuspend={canSuspend}
        canUpdate={canUpdate}
        canWithdraw={canWithdraw}
        canWithdrawForAmendment={canWithdrawForAmendment}
        canWithdrawOwnRequest={canWithdrawOwnRequest}
      />
    </div>
  ) : undefined;

  return (
    <PageShell
      actions={headerActions}
      eyebrow="Funding calls"
      icon={<CircleDollarSign />}
      title="Manage funding calls"
    >
      {call?.draftVersionId ? (
        <p className="mb-4 rounded-lg bg-brand-blue/10 p-4 text-sm">
          Preparing a replacement. The current published version remains{" "}
          {call.effectiveStatus?.toLowerCase()}. Proposed changes take effect
          only after fresh approval and publication.
        </p>
      ) : null}
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
      {call?.currentPublishedVersionId ? (
        <FundingCallVersionsPanel
          id={id}
          canEdit={canUpdate}
          rowVersion={call.rowVersion}
        />
      ) : null}
    </PageShell>
  );
}
