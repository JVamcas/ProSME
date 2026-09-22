export type FundingCallGovernancePolicy = {
  allowSubmitterWithdrawal: boolean;
  enforceMakerChecker: boolean;
};

export type FundingCallGovernanceReviewContext = {
  creatorId: string;
  materialEditorId: string;
  submittedBy: string;
};

export function canApproveFundingCall(
  actorId: string,
  policy: FundingCallGovernancePolicy,
  review: FundingCallGovernanceReviewContext,
) {
  return !policy.enforceMakerChecker
    || (actorId !== review.creatorId && actorId !== review.materialEditorId);
}

export function fundingCallWithdrawalDenial(
  actorId: string,
  policy: FundingCallGovernancePolicy,
  review: FundingCallGovernanceReviewContext,
): "not_submitter" | "withdrawal_disabled" | null {
  if (!policy.allowSubmitterWithdrawal) return "withdrawal_disabled";
  if (actorId !== review.submittedBy) return "not_submitter";
  return null;
}
