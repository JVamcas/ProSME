export const publicFundingHref = "/how-to-apply/funding";

export function publicFundingCallHref(fundingCallId: string) {
  return `${publicFundingHref}/${encodeURIComponent(fundingCallId)}`;
}

export function publicEligibilityHref(fundingCallId: string) {
  return `${publicFundingCallHref(fundingCallId)}/eligibility`;
}
