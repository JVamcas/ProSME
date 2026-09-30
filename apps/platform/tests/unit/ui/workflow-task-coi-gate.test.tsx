// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { operator } from "@/modules/conditions/domain/Operator";
import type { WorkflowTaskCoiGate as CoiGate } from "@/modules/workflows/ClientWorkflowCoiService";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@/modules/workflows/ui/runtime/useWorkflowCoi", () => ({
  useDeclareWorkflowCoi: () => ({
    error: null,
    isError: false,
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));

import { WorkflowTaskCoiGate } from "@/modules/workflows/ui/runtime/WorkflowTaskCoiGate";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const gate: CoiGate = {
  cleared: false,
  form: {
    displayMode: "SINGLE_PAGE",
    fields: [
      {
        columnSpan: 2,
        helpText: "Choose Yes if a relationship may affect your impartiality.",
        key: "HAS_CONFLICT",
        label: "Do you have a potential conflict of interest?",
        order: 1,
        required: true,
        sectionId: "coi-section",
        type: "YES_NO",
      },
      {
        columnSpan: 2,
        key: "DISCLOSURE_TEXT",
        label: "Describe the potential conflict",
        maxLength: 4000,
        minLength: 1,
        order: 2,
        required: true,
        sectionId: "coi-section",
        type: "TEXTAREA",
        visibilityCondition: {
          children: [
            {
              id: "condition",
              kind: "CONDITION",
              leftOperand: { key: "HAS_CONFLICT", kind: "FIELD" },
              operator: operator("EQUALS"),
              rightOperand: { kind: "CONSTANT", value: true },
            },
          ],
          combinator: "AND",
          id: "group",
          kind: "GROUP",
        },
      },
    ],
    instructions: "Select the statement that applies to this assignment.",
    sections: [
      {
        columnSpan: 2,
        description: "",
        id: "coi-section",
        key: "DECLARATION",
        order: 1,
        showContainer: false,
        title: "Conflict of interest declaration",
      },
    ],
    submitLabel: "Submit declaration",
    versionId: "88888888-8888-4888-8888-888888888888",
    versionNumber: 1,
  },
  gated: true,
  rowVersion: 3,
  state: "DECLARATION_REQUIRED",
  taskId: "22222222-2222-4222-8222-222222222222",
  taskName: "Independent technical review",
  taskStatus: "PENDING",
};

let root: Root | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutateAsync.mockResolvedValue({ state: "PENDING_REVIEW" });
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  document.body.replaceChildren();
});

describe("workflow task COI gate", () => {
  it("uses PageShell and reveals the engine-built disclosure field", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<WorkflowTaskCoiGate gate={gate} />));

    expect(container.querySelector("h1")?.textContent).toBe(
      "Independent technical review",
    );
    expect(container.querySelector('a[href="/admin/work-queue"]')).not.toBeNull();
    expect(container.querySelector("textarea")).toBeNull();

    const yes = container.querySelector<HTMLInputElement>(
      'input[type="radio"]',
    );
    await act(async () => yes?.click());

    const disclosure = container.querySelector<HTMLTextAreaElement>("textarea");
    expect(disclosure).not.toBeNull();
    await act(async () => {
      if (!disclosure) return;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(
        disclosure,
        "A family relationship with the applicant",
      );
      disclosure.dispatchEvent(new Event("input", { bubbles: true }));
      disclosure.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
      await Promise.resolve();
    });

    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      {
        decision: "DISCLOSE",
        disclosureText: "A family relationship with the applicant",
        expectedRowVersion: 3,
      },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });
});
