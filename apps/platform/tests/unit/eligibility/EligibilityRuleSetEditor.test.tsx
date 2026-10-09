import "../../support/NavigationTestMocks";
// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { eligibilityRuleSetQueryKeys } from "@/modules/eligibility/EligibilityRuleSetHooks";
import {
  builder,
  ruleSetId,
} from "../../support/EligibilityRuleSetEditorFixture";
import { EligibilityRuleSetEditor } from "@/modules/eligibility/ui/EligibilityRuleSetEditor";
import { EligibilityRuleSetHeaderActions } from "@/modules/eligibility/ui/EligibilityRuleSetHeaderActions";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

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
  client.setQueryData(eligibilityRuleSetQueryKeys.detail(ruleSetId), {
    ...builder("DRAFT"),
    conditionFields: [],
    context: { fundingCalls: [] },
    rules: [],
  });
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
    await act(async () =>
      root?.render(
        <QueryClientProvider client={queryClient("DRAFT")}>
          <EligibilityRuleSetEditor canUpdate id={ruleSetId} />
        </QueryClientProvider>,
      ),
    );

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

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Edit EMPLOYEE_REQUIRED"]',
        )
        ?.click(),
    );

    expect(document.body.textContent).toContain("Edit eligibility rule");
    expect(document.body.textContent).toContain("Failure type");
    expect(document.body.textContent).toContain("Execution mode");
    expect(document.body.textContent).toContain("Eligibility question");
    expect(document.body.textContent).toContain("Is your business registered?");
    expect(document.body.textContent).toContain(
      "Message shown when this rule is not met",
    );
    expect(document.body.querySelector('[aria-label="Field"]')).not.toBeNull();
    expect(
      document.body.querySelector('[aria-label="Operator"]'),
    ).not.toBeNull();
    expect(document.body.textContent).toContain(
      "[Applicant / Application].Employee count",
    );
  });

  it("keeps Published rulesets read-only", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <QueryClientProvider client={queryClient("PUBLISHED")}>
          <EligibilityRuleSetEditor canUpdate id={ruleSetId} />
        </QueryClientProvider>,
      ),
    );

    expect(container.textContent).toContain("This version is read-only.");
    expect(container.textContent).not.toContain("Add rule");
    expect(
      container.querySelector('[aria-label="Edit EMPLOYEE_REQUIRED"]'),
    ).toBeNull();
    expect(
      container.querySelector('[aria-label="Delete EMPLOYEE_REQUIRED"]'),
    ).toBeNull();
  });

  it("asks for confirmation before deleting a draft rule", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <QueryClientProvider client={queryClient("DRAFT")}>
          <EligibilityRuleSetEditor canUpdate id={ruleSetId} />
        </QueryClientProvider>,
      ),
    );

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Delete EMPLOYEE_REQUIRED"]',
        )
        ?.click(),
    );

    expect(document.body.textContent).toContain("Delete eligibility rule");
    expect(document.body.textContent).toContain("Delete EMPLOYEE_REQUIRED?");
    expect(container.textContent).toContain("EMPLOYEE_REQUIRED");
  });

  it("asks for confirmation before publishing a draft version", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <QueryClientProvider client={queryClient("DRAFT")}>
          <EligibilityRuleSetHeaderActions
            canPublish
            canRetire={false}
            canUpdate
            id={ruleSetId}
            initialName="SME Fund Standard"
            initialStatus="DRAFT"
            initialVersionNumber={1}
          />
        </QueryClientProvider>,
      ),
    );

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Publish ruleset version"]',
        )
        ?.click(),
    );

    expect(document.body.textContent).toContain("Publish eligibility ruleset");
    expect(document.body.textContent).toContain(
      "Publish SME Fund Standard version 1?",
    );
  });

  it("keeps the add-rule action visible while an unbound draft is empty", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <QueryClientProvider client={unboundDraftQueryClient()}>
          <EligibilityRuleSetEditor canUpdate id={ruleSetId} />
        </QueryClientProvider>,
      ),
    );

    const addRule = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Add rule"),
    );
    expect(addRule).not.toBeUndefined();
    expect(addRule?.disabled).toBe(true);
    expect(container.textContent).toContain(
      "Bind this draft ruleset to a draft funding call before adding eligibility rules.",
    );
  });
});
