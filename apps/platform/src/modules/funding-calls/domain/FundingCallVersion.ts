import type { FundingCall } from "./FundingCall";
import type { FundingCallPublicationSnapshot } from "./FundingCallPublication";

type WorkingVersion = {
  id: string;
  status: "DRAFT" | "APPROVAL_PENDING" | "APPROVED";
  snapshot: FundingCallPublicationSnapshot;
  createdBy: string;
  updatedBy: string;
  updatedAt: Date;
};

export function fundingCallWorkingView(
  effective: FundingCall,
  working: WorkingVersion | null,
): FundingCall {
  if (!working) return effective;
  return {
    ...effective,
    ...working.snapshot,
    id: effective.id,
    reference: effective.reference,
    slug: effective.slug,
    opensAt: new Date(working.snapshot.opensAt),
    closesAt: new Date(working.snapshot.closesAt),
    status: working.status,
    suspendedFromStatus: null,
    attachmentsLockedAt: null,
    createdBy: working.createdBy,
    updatedBy: working.updatedBy,
    updatedAt: working.updatedAt,
    draftVersionId: working.id,
    effectiveStatus: effective.status,
    effectiveOpensAt: effective.opensAt.toISOString(),
    effectiveClosesAt: effective.closesAt.toISOString(),
  };
}

export function canPrepareFundingCallReplacement(call: FundingCall) {
  return (
    Boolean(call.currentPublishedVersionId) &&
    ["SCHEDULED", "LIVE", "SUSPENDED", "CLOSED"].includes(call.status)
  );
}
