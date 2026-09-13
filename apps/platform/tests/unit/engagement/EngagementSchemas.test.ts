import { describe, expect, it } from "vitest";

import { contactSubmissionSchema, newsletterSubscriptionSchema } from "@/modules/engagement/EngagementSchemas";

describe("public engagement validation", () => {
  it("accepts a valid contact enquiry with explicit consent", () => {
    const result = contactSubmissionSchema.safeParse({ consent: true, email: "owner@example.com", message: "Please share more programme information.", name: "Business Owner", subject: "Funding information" });
    expect(result.success).toBe(true);
  });

  it("rejects missing consent and honeypot submissions", () => {
    expect(newsletterSubscriptionSchema.safeParse({ consent: false, email: "owner@example.com" }).success).toBe(false);
    expect(newsletterSubscriptionSchema.safeParse({ company: "spam", consent: true, email: "owner@example.com" }).success).toBe(false);
  });

  it("rejects invalid addresses and undersized messages", () => {
    const result = contactSubmissionSchema.safeParse({ consent: true, email: "not-an-email", message: "short", name: "A", subject: "Hi" });
    expect(result.success).toBe(false);
  });
});
