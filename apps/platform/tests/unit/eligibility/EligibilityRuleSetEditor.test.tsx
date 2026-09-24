// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import {
  eligibilityRuleSetQueryKeys,
} from "@/modules/eligibility/EligibilityRuleSetHooks";
import type { EligibilityRuleSetBuilderView } from "@/modules/eligibility/api/EligibilityRuleSetTransport";
import { EligibilityRuleSetEditor } from "@/modules/eligibility/ui/EligibilityRuleSetEditor";
import { EligibilityRuleSetHeaderActions } from "@/modules/eligibility/ui/EligibilityRuleSetHeaderActions";

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
    availableQuestions: [{
      applicantLabel: "How many people does your business employ?",
      code: "EMPLOYEE_COUNT",
      id: "70000000-0000-4000-8000-000000000014",
      inputType: "NUMBER",
      reviewerLabel: "Employee count",
    }, {
      applicantLabel: "Is your business registered?",
      code: "BUSINESS_REGISTERED",
      id: "70000000-0000-4000-8000-000000000015",
      inputType: "BOOLEAN",
      reviewerLabel: "Business registration",
    }],
    definition: {
      code: "SME_STANDARD",
      createdAt: timestamp,
      createdBy: "70000000-0000-4000-8000-000000000009",
      description: "Standard SME eligibility",
      id: ruleSetId,
      name: "SME Standard",
      updatedAt: timestamp,
    },
    conditionFields: [{
      availableIn: ["SELF_CHECK", "SCREENING"],
      key: "eligibility.EMPLOYEE_COUNT",
      label: "Employee count",
      screeningSource: {
        sourceDefinitionId: "70000000-0000-4000-8000-000000000011",
        sourceKey: "EMPLOYEE_COUNT",
        sourceKind: "APPLICATION_FORM_FIELD",
        sourceVersionId: "70000000-0000-4000-8000-000000000012",
        valuePath: "answers.EMPLOYEE_COUNT",
      },
      sourceDefinitionId: "70000000-0000-4000-8000-000000000013",
      sourceKind: "ELIGIBILITY_INPUT",
      sourceVersionId: versionId,
      type: "NUMBER",
    }],
    context: {
      fundingCalls: [{
        id: "70000000-0000-4000-8000-000000000010",
        title: "Growth Fund",
      }],
    },
    rules: [{
      applicantMessage: "Your business must employ at least one person.",
      condition: {
        children: [{
          id: "70000000-0000-4000-8000-000000000005",
          kind: "CONDITION",
          leftOperand: {
            key: "eligibility.EMPLOYEE_COUNT",
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
      questionId: "70000000-0000-4000-8000-000000000014",
      reasonCode: "EMPLOYEE_REQUIRED",
    }],
    registryIssues: [],
    screeningSources: [{
      availableBeforeEligibility: true,
      fundingCallId: "70000000-0000-4000-8000-000000000010",
      label: "Verified employee count",
      sourceDefinitionId: "70000000-0000-4000-8000-000000000011",
      sourceKey: "EMPLOYEE_COUNT",
      sourceKind: "APPLICATION_FORM_FIELD",
      sourceVersionId: "70000000-0000-4000-8000-000000000012",
      supportedTypes: ["NUMBER"],
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
  } as unknown as EligibilityRuleSetBuilderView;
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

function unboundDraftQueryClient() {
  const client = queryClient("DRAFT");
  client.setQueryData(
    eligibilityRuleSetQueryKeys.detail(ruleSetId),
    {
      ...builder("DRAFT"),
      conditionFields: [],
      context: { fundingCalls: [] },
      rules: [],
    },
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
          canUpdate
          id={ruleSetId}
        />
      </QueryClientProvider>,
    ));

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.textContent).toContain("Reason code");
    expect(container.textContent).toContain("Applicant message");
    expect(container.textContent).toContain("Condition");
    const addRuleButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Add rule"),
    );
    expect(addRuleButton?.closest("header")).toBeNull();
    expect(
      addRuleButton?.closest("section")?.querySelector("table"),
    ).not.toBeNull();

    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Edit EMPLOYEE_REQUIRED"]',
    )?.click());

    expect(document.body.textContent).toContain("Edit eligibility rule");
    expect(document.body.textContent).toContain("Failure type");
    expect(document.body.textContent).toContain("Execution mode");
    expect(document.body.textContent).toContain("Eligibility question");
    expect(document.body.textContent).toContain(
      "Is your business registered?",
    );
    expect(document.body.textContent).toContain(
      "Message shown when this rule is not met",
    );
    expect(document.body.querySelector('[aria-label="Field"]')).not.toBeNull();
    expect(document.body.querySelector('[aria-label="Operator"]')).not.toBeNull();
    expect(document.body.textContent).toContain(
      "Employee count [Applicant / Application]",
    );
  });

  it("keeps Published rulesets read-only", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={queryClient("PUBLISHED")}>
        <EligibilityRuleSetEditor
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

  it("asks for confirmation before deleting a draft rule", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={queryClient("DRAFT")}>
        <EligibilityRuleSetEditor
          canUpdate
          id={ruleSetId}
        />
      </QueryClientProvider>,
    ));

    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Delete EMPLOYEE_REQUIRED"]',
    )?.click());

    expect(document.body.textContent).toContain("Delete eligibility rule");
    expect(document.body.textContent).toContain("Delete EMPLOYEE_REQUIRED?");
    expect(container.textContent).toContain("EMPLOYEE_REQUIRED");
  });

  it("asks for confirmation before publishing a draft version", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={queryClient("DRAFT")}>
        <EligibilityRuleSetHeaderActions
          canPublish
          canRetire={false}
          canUpdate
          id={ruleSetId}
          initialName="SME Standard"
          initialStatus="DRAFT"
          initialVersionNumber={1}
        />
      </QueryClientProvider>,
    ));

    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Publish ruleset version"]',
    )?.click());

    expect(document.body.textContent).toContain("Publish eligibility ruleset");
    expect(document.body.textContent).toContain("Publish SME Standard version 1?");
  });

  it("keeps the add-rule action visible while an unbound draft is empty", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(
      <QueryClientProvider client={unboundDraftQueryClient()}>
        <EligibilityRuleSetEditor
          canUpdate
          id={ruleSetId}
        />
      </QueryClientProvider>,
    ));

    const addRule = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Add rule"),
    );
    expect(addRule).not.toBeUndefined();
    expect(addRule?.disabled).toBe(true);
    expect(container.textContent).toContain(
      "Bind this draft ruleset to a draft funding call before adding eligibility rules.",
    );
  });
});
