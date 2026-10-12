// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowTaskWorkSections } from "@/modules/workflows/ui/WorkflowTaskWorkSections";
import type { WorkflowTaskWorkSectionsProps } from "@/modules/workflows/ui/WorkflowTaskWorkSections";

vi.mock("@/modules/workflows/ui/WorkflowTaskDocumentsSection", () => ({
  WorkflowTaskDocumentsSection: () => <p>Document content</p>,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => document.body.replaceChildren());

const props: WorkflowTaskWorkSectionsProps = {
  checklistItems: [{ code: "CHECK", label: "Review sales", required: true }],
  commentFields: [],
  disabled: false,
  displayMode: "STEP_PROGRESS",
  documentRequirements: [{
    id: "document", name: "Financial records", stableKey: "RECORDS", mandatory: true,
  }] as WorkflowTaskWorkSectionsProps["documentRequirements"],
  form: { content: <input aria-label="Draft amount" defaultValue="100" />, title: "Financial form" },
  scoring: null,
  status: { checklist: "Pending", comments: "", documents: "Pending", form: "Pending", scoring: "" },
};

function View({ sectionOrder, ...rest }: Partial<WorkflowTaskWorkSectionsProps>) {
  const form = useForm();
  return (
    <FormProvider {...form}>
      <WorkflowTaskWorkSections {...props} {...rest} sectionOrder={sectionOrder} />
    </FormProvider>
  );
}

function markers() {
  return Array.from(document.querySelectorAll('nav[aria-label="Task progress"] ol > li'))
    .map((element) => element.textContent?.replace(/^\d+/, ""));
}

describe("task section rendering uses persisted order", () => {
  it("keeps the active section and draft input when order changes and follows the new final step", async () => {
    const finalStep = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<View onFinalStepChange={finalStep} />));
      const input = document.querySelector<HTMLInputElement>('[aria-label="Draft amount"]')!;
      input.value = "250";
      await act(async () => root.render(
        <View sectionOrder={["documents", "checklist", "form"]} onFinalStepChange={finalStep} />,
      ));
      expect(markers()).toEqual(["Documents", "Checklist", "Financial form"]);
      expect(document.querySelector('button[aria-current="step"]')?.textContent).toContain("Financial form");
      expect(document.querySelector('[aria-label="Draft amount"]')).toBe(input);
      expect(input.value).toBe("250");
      expect(finalStep).toHaveBeenLastCalledWith(true);
      await act(async () => root.render(
        <View sectionOrder={["documents", "form", "checklist"]} onFinalStepChange={finalStep} />,
      ));
      expect(finalStep).toHaveBeenLastCalledWith(false);
      const next = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => button.textContent === "Next")!;
      await act(async () => next.click());
      expect(document.querySelector('button[aria-current="step"]')?.textContent).toContain("Checklist");
      expect(finalStep).toHaveBeenLastCalledWith(true);
      expect(document.querySelector('[aria-label="Move form step"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("shows drag handles only when preview editing is enabled and disables them while saving", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(
        <View onSectionOrderChange={() => undefined} orderingPending />,
      ));
      const handles = document.querySelectorAll<HTMLButtonElement>('[aria-label^="Move "]');
      expect(handles.length).toBe(3);
      expect(Array.from(handles).every((button) => button.disabled)).toBe(true);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("uses the same persisted order for collapsible sections", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(
        <View displayMode="SECTIONS" sectionOrder={["documents", "form", "checklist"]} />,
      ));
      const titles = Array.from(document.querySelectorAll("summary"))
        .map((element) => element.textContent);
      expect(titles[0]).toContain("Documents");
      expect(titles[1]).toContain("Financial form");
      expect(titles[2]).toContain("Checklist");
    } finally {
      await act(async () => root.unmount());
    }
  });
});
