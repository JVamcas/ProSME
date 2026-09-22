import { describe, expect, it } from "vitest";

import {
  canApproveFundingCall,
  fundingCallWithdrawalDenial,
} from "@/modules/funding-calls/domain/FundingCallGovernancePolicy";

const strictPolicy = {
  allowSubmitterWithdrawal: true,
  enforceMakerChecker: true,
};
const review = {
  creatorId: "creator",
  materialEditorId: "editor",
  submittedBy: "submitter",
};

describe("funding call governance policy", () => {
  it("allows an independent checker", () => {
    expect(canApproveFundingCall("checker", strictPolicy, review)).toBe(true);
  });

  it("denies creator and last-editor self approval", () => {
    expect(canApproveFundingCall("creator", strictPolicy, review)).toBe(false);
    expect(canApproveFundingCall("editor", strictPolicy, review)).toBe(false);
  });

  it("allows self approval only when maker-checker is disabled", () => {
    expect(canApproveFundingCall(
      "creator",
      { ...strictPolicy, enforceMakerChecker: false },
      review,
    )).toBe(true);
  });

  it("enforces submitter context and withdrawal policy", () => {
    expect(fundingCallWithdrawalDenial("submitter", strictPolicy, review))
      .toBeNull();
    expect(fundingCallWithdrawalDenial("checker", strictPolicy, review))
      .toBe("not_submitter");
    expect(fundingCallWithdrawalDenial(
      "submitter",
      { ...strictPolicy, allowSubmitterWithdrawal: false },
      review,
    )).toBe("withdrawal_disabled");
  });
});
