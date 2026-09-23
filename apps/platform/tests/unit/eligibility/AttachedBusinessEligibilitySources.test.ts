import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/modules/forms/infrastructure/EligibilityFormSourceRepository", () => ({
  readEligibilityFormSources: vi.fn(async () => []),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowEligibilitySourceRepository", () => ({
  readWorkflowEligibilitySources: vi.fn(async () => []),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityIntegrationRepository", () => ({
  readEligibilityIntegrationSources: vi.fn(async () => []),
}));
vi.mock("@/modules/eligibility/domain/EligibilityIntegrationFieldSources", () => ({
  integrationOutputSourceDescriptors: vi.fn(() => []),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallEligibilityContextRepository", () => ({
  readEligibilityRuleSetContexts: vi.fn(async () => []),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(async () => null),
}));

import { buildEligibilityFieldRegistry } from "@/modules/eligibility/domain/EligibilityFieldRegistry";
import { resolveFundingCallEligibilityContext } from "@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration";

describe("business fields on funding-call form attachments", () => {
  it("exposes stable business paths across different attached form versions", async () => {
    const [first, second] = await Promise.all([
      resolveFundingCallEligibilityContext({
        formVersionId: "187683cd-e433-4fe6-926d-84e7c359d15a",
        id: "75bb633f-3898-4ecd-bc52-b79e485d2228",
        title: "First call",
        workflowTemplateVersionId: null,
      }),
      resolveFundingCallEligibilityContext({
        formVersionId: "25ce55f5-6692-496e-a1bd-79574dd069ad",
        id: "3ad0f430-b757-4a5b-9dda-6ba38ed9c9a6",
        title: "Second call",
        workflowTemplateVersionId: null,
      }),
    ]);
    const registry = buildEligibilityFieldRegistry({
      contexts: [first, second],
      inputs: [],
    });
    expect(registry.fields.map((field) => field.key)).toContain(
      "application.BUSINESS_EMPLOYEE_COUNT",
    );
    const source = first.sources.find(
      (item) => item.sourceKey === "BUSINESS_EMPLOYEE_COUNT",
    );
    expect(source?.supportedTypes).toEqual(["NUMBER"]);
    expect(source?.sourceVersionId).toBeNull();
  });

  it("removes generated business sources when the form is detached", async () => {
    const context = await resolveFundingCallEligibilityContext({
      formVersionId: null,
      id: "75bb633f-3898-4ecd-bc52-b79e485d2228",
      title: "Call without form",
      workflowTemplateVersionId: null,
    });
    expect(context.sources.some((source) => (
      source.sourceKey === "BUSINESS_LEGAL_NAME"
    ))).toBe(false);
  });
});
