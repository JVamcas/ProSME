import { describe, expect, it } from "vitest";

import { emailVerificationNotice } from "@/modules/users/ui/auth/use-email-verification";

describe("email verification copy", () => {
  it("explains an unverified address without exposing the identity provider", () => {
    const notice = emailVerificationNotice(false, false);

    expect(notice).toBe(
      "Your email address is not verified yet. Open the verification link we emailed you, then select “I have verified my email” again.",
    );
    expect(notice).not.toContain("Firebase");
  });

  it("confirms when a replacement verification link was sent", () => {
    expect(emailVerificationNotice(true, false)).toBe(
      "A new verification link has been sent. Check your inbox and spam folder.",
    );
  });
});
