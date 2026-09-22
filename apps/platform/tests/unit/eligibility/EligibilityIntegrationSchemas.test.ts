import { describe, expect, it } from "vitest";

import {
  eligibilityIntegrationBindingSchema,
  eligibilityIntegrationCreateSchema,
  eligibilityIntegrationManualResultSchema,
} from "@/modules/eligibility/api/EligibilityIntegrationSchemas";

describe("eligibility integration configuration schemas", () => {
  it("accepts a typed, versioned output catalogue and secret reference", () => {
    const result = eligibilityIntegrationCreateSchema.safeParse({
      definition: {
        description: "Checks a configured external register.",
        name: "Business registration verification",
        stableKey: "business_registration",
      },
      version: {
        outputSchema: [{
          description: "Whether the registration is active.",
          eligibleForScreening: true,
          key: "active",
          label: "Active registration",
          type: "BOOLEAN",
        }],
        rawResponsePolicy: { kind: "RETAIN", retentionDays: 30 },
        retryPolicy: {
          initialBackoffMs: 500,
          maxAttempts: 3,
          timeoutMs: 5_000,
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects duplicate output keys and embedded secret values", () => {
    const result = eligibilityIntegrationCreateSchema.safeParse({
      definition: { name: "Register", stableKey: "register" },
      version: {
        outputSchema: [
          { key: "active", label: "Active", type: "BOOLEAN" },
          { key: "active", label: "Duplicate", type: "BOOLEAN" },
        ],
        rawResponsePolicy: { kind: "DISCARD" },
        retryPolicy: {
          initialBackoffMs: 0,
          maxAttempts: 1,
          timeoutMs: 1_000,
        },
        secretValue: "must-not-be-accepted",
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires evidence for a manual fallback result", () => {
    expect(eligibilityIntegrationManualResultSchema.safeParse({
      evidenceReference: "",
      normalizedOutputs: { active: true },
      status: "SUCCEEDED",
    }).success).toBe(false);
  });

  it("keeps provider selection on the binding instead of the output contract", () => {
    const base = {
      integrationVersionId: "10000000-0000-4000-8000-000000000001",
      manualFallbackAllowed: true,
      providerDisplayName: "Register A",
      secretReference: "secret-manager/register-a",
    };
    const first = eligibilityIntegrationBindingSchema.parse({
      ...base,
      providerAdapterKey: "register_a",
    });
    const replacement = eligibilityIntegrationBindingSchema.parse({
      ...base,
      providerAdapterKey: "register_b",
      providerDisplayName: "Register B",
      secretReference: "secret-manager/register-b",
    });

    expect(first.integrationVersionId).toBe(replacement.integrationVersionId);
  });
});
