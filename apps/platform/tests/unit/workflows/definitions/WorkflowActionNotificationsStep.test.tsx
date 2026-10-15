// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { WorkflowActionNotificationsStep } from "@/modules/workflows/ui/definitions/WorkflowActionNotificationsStep";
import { workflowActionFormDefaults } from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";
import {
  workflowActionFormSchema,
  type WorkflowActionFormValues,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormSchema";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

vi.mock("@/shared/ui/FormRichTextField", async () => {
  const { useFormContext } = await import("react-hook-form");
  return {
    FormRichTextField: ({ name, label }: { name: string; label: string }) => {
      const form = useFormContext();
      return (
        <label>
          {label}
          <textarea {...form.register(name)} />
        </label>
      );
    },
  };
});
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const editor = {
  definition: {
    id: "definition",
    code: "REFERENCE",
    name: "Reference",
    description: "",
  },
  graph: referenceWorkflow,
  assignmentOptions: { users: [], roles: [] },
} as unknown as WorkflowEditorView;

function Harness({
  capture,
}: {
  capture: (values: WorkflowActionFormValues) => void;
}) {
  const form = useForm<WorkflowActionFormValues>({
    defaultValues: workflowActionFormDefaults(undefined, 1),
    resolver: zodResolver(workflowActionFormSchema),
  });
  return (
    <FormProvider {...form}>
      <WorkflowActionNotificationsStep
        editor={editor}
        stage={editor.graph.stages[0]}
      />
      <button onClick={() => capture(form.getValues())}>Inspect rows</button>
    </FormProvider>
  );
}
async function click(text: string) {
  const element = [
    ...document.querySelectorAll<HTMLElement>('button, [role="menuitem"]'),
  ].find(
    (item) =>
      item.textContent === text || item.getAttribute("aria-label") === text,
  );
  expect(element).toBeDefined();
  await act(async () => element!.click());
}
async function fill(name: string, value: string) {
  const element = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[name="${name}"]`)!;
  const prototype =
    element.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("action notification table and dialog", () => {
  it("adds, edits, and removes rows while preserving parameters and unconditional delivery", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const client = new QueryClient();
    const capture = vi.fn();
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <Harness capture={capture} />
          </QueryClientProvider>,
        ),
      );
      await click("Add notification");
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        "Without a condition",
      );
      await fill("subject", "Decision ");
      await click("Insert subject parameter");
      await click("Funding call title");
      expect(
        document.querySelector<HTMLInputElement>('[name="subject"]')?.value,
      ).toContain("{{fundingcalltitle}}");
      await fill("body", "<p>Hello {{recipientname}}</p>");
      await click("Save notification");
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(container.textContent).toContain("Always send");
      expect(container.textContent).toContain("{{fundingcalltitle}}");
      await click("Inspect rows");
      const saved = capture.mock.calls[0][0].notifications[0];
      expect(saved).toMatchObject({
        condition: null,
        recipientType: "APPLICATION_OWNER",
        body: "<p>Hello {{recipientname}}</p>",
      });
      await click(`Actions for ${saved.subject}`);
      await click("Edit");
      await fill("subject", "Updated decision");
      await click("Save notification");
      expect(container.textContent).toContain("Updated decision");
      await click("Actions for Updated decision");
      await click("Delete");
      expect(container.textContent).toContain("No notifications configured");
    } finally {
      await act(async () => root.unmount());
      container.remove();
      client.clear();
    }
  });
});
