// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clientEligibilityRuleSetService } from "@/modules/eligibility/ClientEligibilityRuleSetService";
import { eligibilityRuleSetQueryKeys } from "@/modules/eligibility/EligibilityRuleSetHooks";
import { EligibilityRuleSetTestScreen } from "@/modules/eligibility/ui/EligibilityRuleSetTestScreen";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const ruleSetId = "90000000-0000-4000-8000-000000000001";
const draftVersionId = "90000000-0000-4000-8000-000000000002";
const publishedVersionId = "90000000-0000-4000-8000-000000000003";
let root: Root | undefined;

function queryClient() {
  const timestamp = "2026-09-20T08:00:00.000Z";
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(eligibilityRuleSetQueryKeys.detail(ruleSetId), {
    allowedActions: ["UPDATE", "PUBLISH"],
    definition: {
      code: "SME_STANDARD",
      createdAt: timestamp,
      description: "Standard SME eligibility",
      id: ruleSetId,
      name: "SME Standard",
      updatedAt: timestamp,
    },
    conditionFields: [{
      key: "application.EMPLOYEE_COUNT",
      label: "Employee count",
      type: "NUMBER",
    }],
    context: {
      fundingCalls: [{
        id: "90000000-0000-4000-8000-000000000010",
        title: "Growth Fund",
      }],
    },
    rules: [],
    version: {
      createdAt: timestamp,
      id: draftVersionId,
      publishedAt: null,
      retiredAt: null,
      rowVersion: 1,
      ruleSetId,
      status: "DRAFT",
      updatedAt: timestamp,
      versionNumber: 2,
    },
    versions: [
      {
        createdAt: timestamp,
        id: draftVersionId,
        publishedAt: null,
        retiredAt: null,
        rowVersion: 1,
        ruleSetId,
        status: "DRAFT",
        updatedAt: timestamp,
        versionNumber: 2,
      },
      {
        createdAt: timestamp,
        id: publishedVersionId,
        publishedAt: timestamp,
        retiredAt: null,
        rowVersion: 2,
        ruleSetId,
        status: "PUBLISHED",
        updatedAt: timestamp,
        versionNumber: 1,
      },
    ],
  });
  return client;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("EligibilityRuleSetTestScreen", () => {
  it("tests Draft or Published versions and previews every rule outcome", async () => {
    const runTest = vi.spyOn(clientEligibilityRuleSetService, "test")
      .mockResolvedValue({
        applicantMessages: ["Provide at least one employee."],
        authoritative: false,
        eligible: false,
        evaluatedValues: { "application.business.employee_count": 0 },
        hardFailures: [{
          applicantMessage: "Provide at least one employee.",
          failureType: "HARD_FAIL",
          reasonCode: "EMPLOYEE_REQUIRED",
          ruleId: "rule-1",
        }],
        manualScreeningRequired: false,
        mode: "SELF_CHECK",
        reasonCodes: ["EMPLOYEE_REQUIRED"],
        ruleOutcomes: [
          {
            applicantMessage: "Provide at least one employee.",
            failureType: "HARD_FAIL",
            passed: false,
            reasonCode: "EMPLOYEE_REQUIRED",
            ruleId: "rule-1",
          },
          {
            applicantMessage: "Your registration is valid.",
            failureType: "WARNING",
            passed: true,
            reasonCode: "REGISTRATION_CHECK",
            ruleId: "rule-2",
          },
        ],
        ruleSetId,
        ruleSetVersionId: draftVersionId,
        ruleSetVersionNumber: 2,
        softFailures: [],
        warnings: [],
      });
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={queryClient()}>
        <EligibilityRuleSetTestScreen id={ruleSetId} />
      </QueryClientProvider>,
    ));

    expect(container.textContent).toContain("Growth Fund");
    expect(container.textContent).toContain("Employee count");
    await act(async () => {
      container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await vi.waitFor(() => expect(runTest).toHaveBeenCalled());

    expect(runTest).toHaveBeenCalledWith(
      ruleSetId,
      expect.objectContaining({
        mode: "SELF_CHECK",
        versionId: draftVersionId,
      }),
    );
    expect(container.textContent).toContain("EMPLOYEE_REQUIRED");
    expect(container.textContent).toContain("REGISTRATION_CHECK");
    expect(container.textContent).toContain("Failed");
    expect(container.textContent).toContain("Passed");
    expect(container.textContent).toContain(
      "did not create an authoritative eligibility outcome",
    );
  });
});
