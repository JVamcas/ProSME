// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import {
  eligibilityRuleSetQueryKeys,
} from "@/modules/eligibility/EligibilityRuleSetHooks";
import { EligibilityRuleSetEditor } from "@/modules/eligibility/ui/EligibilityRuleSetEditor";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const ruleSetId = "70000000-0000-4000-8000-000000000001";
const versionId = "70000000-0000-4000-8000-000000000002";

function builder(status: "DRAFT" | "PUBLISHED") {
  const timestamp = "2026-09-20T08:00:00.000Z";
  return {
    allowedActions: status === "DRAFT"
      ? ["UPDATE", "PUBLISH"]
      : ["RETIRE", "CLONE"],
    definition: {
      code: "SME_STANDARD",
      createdAt: timestamp,
      createdBy: "70000000-0000-4000-8000-000000000009",
      description: "Standard SME eligibility",
      id: ruleSetId,
      name: "SME Standard",
      updatedAt: timestamp,
    },
    rules: [{
      applicantMessage: "Your business must employ at least one person.",
      condition: {
        children: [{
          id: "70000000-0000-4000-8000-000000000005",
          kind: "CONDITION",
          leftOperand: {
            key: "application.business.employee_count",
            kind: "FIELD",
          },
          operator: "GREATER_THAN",
          rightOperand: { kind: "CONSTANT", value: 0 },
        }],
        combinator: "AND",
        id: "70000000-0000-4000-8000-000000000004",
        kind: "GROUP",
      },
      executionMode: "BOTH",
      failureType: "HARD_FAIL",
      id: "70000000-0000-4000-8000-000000000003",
      order: 1,
      reasonCode: "EMPLOYEE_REQUIRED",
    }],
    version: {
      createdAt: timestamp,
      createdBy: "70000000-0000-4000-8000-000000000009",
      id: versionId,
      publishedAt: status === "PUBLISHED" ? timestamp : null,
      retiredAt: null,
      rowVersion: 1,
      ruleSetId,
      status,
      updatedAt: timestamp,
      versionNumber: 1,
    },
    versions: [],
  } as never;
}

function queryClient(status: "DRAFT" | "PUBLISHED") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(
    eligibilityRuleSetQueryKeys.detail(ruleSetId),
    builder(status),
  );
  return client;
}

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("EligibilityRuleSetEditor", () => {
  it("edits Draft outcome metadata through the shared condition builder", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={queryClient("DRAFT")}>
        <EligibilityRuleSetEditor
          canPublish
          canRetire={false}
          canUpdate
          id={ruleSetId}
        />
      </QueryClientProvider>,
    ));

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.textContent).toContain("Reason code");
    expect(container.textContent).toContain("Applicant message");
    expect(container.textContent).toContain("Condition");

    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Edit EMPLOYEE_REQUIRED"]',
    )?.click());

    expect(document.body.textContent).toContain("Edit eligibility rule");
    expect(document.body.textContent).toContain("Failure type");
    expect(document.body.textContent).toContain("Execution mode");
    expect(document.body.textContent).toContain("Applicant-facing message");
    expect(document.body.querySelector('[aria-label="Field"]')).not.toBeNull();
    expect(document.body.querySelector('[aria-label="Operator"]')).not.toBeNull();
  });

  it("keeps Published rulesets read-only", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={queryClient("PUBLISHED")}>
        <EligibilityRuleSetEditor
          canPublish={false}
          canRetire
          canUpdate
          id={ruleSetId}
        />
      </QueryClientProvider>,
    ));

    expect(container.textContent).toContain("This version is read-only.");
    expect(container.textContent).not.toContain("Add rule");
    expect(container.querySelector(
      '[aria-label="Edit EMPLOYEE_REQUIRED"]',
    )).toBeNull();
    expect(container.querySelector(
      '[aria-label="Delete EMPLOYEE_REQUIRED"]',
    )).toBeNull();
  });
});
