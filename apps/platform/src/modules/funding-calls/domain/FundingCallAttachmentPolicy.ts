import type { FundingCall } from "./FundingCall";

type Attachments = Pick<
  FundingCall,
  "formVersionId" | "eligibilityRuleSetVersionId" | "workflowTemplateVersionId"
>;

export class FundingCallAttachmentsLockedError extends Error {
  constructor() {
    super(
      "The application form, eligibility ruleset and workflow versions cannot be changed because applications have already been created for this funding call. Create or clone a funding call to use different versions.",
    );
    this.name = "FundingCallAttachmentsLockedError";
  }
}

export function assertFundingCallAttachmentsUnchanged(
  current: Attachments & Pick<FundingCall, "attachmentsLockedAt">,
  proposed: Attachments,
) {
  if (!current.attachmentsLockedAt) return;
  if (
    current.formVersionId !== proposed.formVersionId
    || current.eligibilityRuleSetVersionId !== proposed.eligibilityRuleSetVersionId
    || current.workflowTemplateVersionId !== proposed.workflowTemplateVersionId
  ) {
    throw new FundingCallAttachmentsLockedError();
  }
}
