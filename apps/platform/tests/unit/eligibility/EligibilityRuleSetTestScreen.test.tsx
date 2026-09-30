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

function rule(key: string, executionMode: "SELF_CHECK" | "SCREENING" | "BOTH") {
  return {
    condition: {
      children: [{
        id: `condition-${key}`,
        kind: "CONDITION",
        leftOperand: { key: `eligibility.${key}`, kind: "FIELD" },
        operator: "EQUALS",
        rightOperand: { kind: "CONSTANT", value: 0 },
      }],
      combinator: "AND",
      id: `group-${key}`,
      kind: "GROUP",
    },
    executionMode,
  };
}

function queryClient() {
  const timestamp = "2026-09-20T08:00:00.000Z";
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(eligibilityRuleSetQueryKeys.detail(ruleSetId), {
    allowedActions: ["UPDATE", "PUBLISH"],
    availableQuestions: [{
      applicantLabel: "How many employees do you have?",
      code: "employee_count",
      reviewerLabel: "Employee count",
    }],
    definition: {
      code: "SME_STANDARD",
      createdAt: timestamp,
      description: "Standard SME Fund eligibility",
      id: ruleSetId,
      name: "SME Fund Standard",
      updatedAt: timestamp,
    },
    conditionFields: [{
      availableIn: ["SELF_CHECK", "SCREENING"],
      key: "eligibility.employee_count",
      label: "Employee count",
      type: "NUMBER",
    }, {
      availableIn: ["SELF_CHECK", "SCREENING"],
      key: "eligibility.applicant_age",
      label: "Applicant age",
      type: "NUMBER",
    }, {
      availableIn: ["SELF_CHECK", "SCREENING"],
      key: "eligibility.verified_age",
      label: "Verified age",
      type: "NUMBER",
    }, {
      availableIn: ["SELF_CHECK", "SCREENING"],
      key: "eligibility.unused_input",
      label: "Unused input",
      type: "NUMBER",
    }],
    context: {
      fundingCalls: [{
        id: "90000000-0000-4000-8000-000000000010",
        title: "Growth Fund",
      }],
    },
    rules: [
      rule("employee_count", "BOTH"),
      rule("applicant_age", "SELF_CHECK"),
      rule("verified_age", "SCREENING"),
    ],
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
        evaluatedValues: { "eligibility.employee_count": 0 },
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
    expect(container.textContent).toContain("How many employees do you have?");
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

    const mode = container.querySelector<HTMLSelectElement>('[name="mode"]');
    await act(async () => {
      mode!.value = "SCREENING";
      mode!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.textContent).not.toContain("Test result");
    expect(container.textContent).not.toContain("EMPLOYEE_REQUIRED");
  });

  it("refreshes questions, wording, and submitted values when switching modes", async () => {
    const runTest = vi.spyOn(clientEligibilityRuleSetService, "test")
      .mockRejectedValue(new Error("Sample test failure"));
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={queryClient()}>
        <EligibilityRuleSetTestScreen id={ruleSetId} />
      </QueryClientProvider>,
    ));

    expect(container.textContent).toContain("How many employees do you have?");
    expect(container.textContent).toContain("Applicant age");
    expect(container.textContent).not.toContain("Verified age");
    expect(container.textContent).not.toContain("Unused input");

    const mode = container.querySelector<HTMLSelectElement>('[name="mode"]');
    for (const selectedMode of ["SCREENING", "SELF_CHECK"]) {
      await act(async () => {
        mode!.value = selectedMode;
        mode!.dispatchEvent(new Event("change", { bubbles: true }));
      });
      const screening = selectedMode === "SCREENING";
      expect(container.textContent).toContain(screening
        ? "Employee count"
        : "How many employees do you have?");
      expect(container.textContent).toContain(screening
        ? "Verified age"
        : "Applicant age");
      expect(container.textContent).not.toContain(screening
        ? "Applicant age"
        : "Verified age");
      expect(container.textContent).not.toContain("Unused input");

      await act(async () => container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ));
      expect(runTest).toHaveBeenLastCalledWith(ruleSetId, expect.objectContaining({
        mode: selectedMode,
        values: {
          eligibility: {
            employee_count: 0,
            [screening ? "verified_age" : "applicant_age"]: 0,
          },
        },
      }));
    }
  });
});
