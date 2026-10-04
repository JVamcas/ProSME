// @vitest-environment happy-dom

import { zodResolver } from "@hookform/resolvers/zod";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { requestInformation } from "@/modules/workflows/domain/standard/StandardWorkflowBuilders";
import {
  toWorkflowActionDefinition,
  workflowActionFormDefaults,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";
import {
  workflowActionFormSchema,
  type WorkflowActionFormValues,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormSchema";
import { WorkflowActionConfigurationFields } from "@/modules/workflows/ui/definitions/WorkflowActionConfigurationFields";
import { WorkflowTaskInformationRequestFields } from "@/modules/workflows/ui/tasks/WorkflowTaskInformationRequestFields";
import {
  actionFormDefaults,
  actionFormSchema,
  type ActionValues,
} from "@/modules/workflows/ui/tasks/WorkflowTaskActionForm";
import { workflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";

vi.mock("@/shared/ui/FormRichTextField", () => ({
  FormRichTextField: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(content: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(content));
  return {
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

describe("request information response settings UI", () => {
  it("saves each runtime override switch independently in the designer", async () => {
    const action = requestInformation("REQUEST_INFO", "Request information", 1);
    const save = vi.fn();
    function Designer() {
      const form = useForm<WorkflowActionFormValues>({
        defaultValues: workflowActionFormDefaults(action, 1),
        resolver: zodResolver(workflowActionFormSchema),
      });
      return (
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              save(toWorkflowActionDefinition(values)),
            )}
          >
            <WorkflowActionConfigurationFields
              actionType="REQUEST_INFORMATION"
              assignmentOptions={{ roles: [], users: [] }}
              deferTargetType="DATE"
              escalationTargetType="ROLE"
            />
            <button type="submit">Save</button>
          </form>
        </FormProvider>
      );
    }
    const view = await mount(<Designer />);
    try {
      for (const key of [
        "deadlineDays",
        "expiryAction",
        "reminderDayOffsets",
      ]) {
        expect(
          view.container.querySelector<HTMLInputElement>(
            `input[name="runtimeOverrides.${key}"]`,
          )?.checked,
        ).toBe(false);
      }
      await act(async () => {
        view.container
          .querySelector<HTMLInputElement>(
            'input[name="runtimeOverrides.deadlineDays"]',
          )!
          .click();
        view.container
          .querySelector<HTMLInputElement>(
            'input[name="runtimeOverrides.reminderDayOffsets"]',
          )!
          .click();
      });
      await act(async () =>
        view.container
          .querySelector<HTMLButtonElement>("button[type=submit]")!
          .click(),
      );
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: expect.objectContaining({
            runtimeOverrides: {
              deadlineDays: true,
              expiryAction: false,
              reminderDayOffsets: true,
            },
          }),
        }),
      );
    } finally {
      await view.cleanup();
    }
  });

  it("prefills runtime defaults and enables only permitted fields", async () => {
    const definition = requestInformation(
      "REQUEST_INFO",
      "Request information",
      1,
    );
    if (definition.actionType !== "REQUEST_INFORMATION")
      throw new Error("Invalid fixture");
    definition.configuration.runtimeOverrides = {
      deadlineDays: true,
      expiryAction: false,
      reminderDayOffsets: true,
    };
    const action: WorkflowTaskAction = {
      actionType: "REQUEST_INFORMATION",
      key: "REQUEST_INFO",
      label: "Request information",
      available: true,
      requiredInput: workflowActionInputMetadata(definition),
      presentation: { displayOrder: 1, variant: "outlineOrange" },
      runtimeVersion: 1,
      unavailableReason: null,
    };
    function Runtime() {
      const form = useForm<ActionValues>({
        defaultValues: actionFormDefaults(action),
        resolver: zodResolver(actionFormSchema(action)),
      });
      return (
        <FormProvider {...form}>
          <WorkflowTaskInformationRequestFields
            action={action}
            task={{ documentRequirements: [] } as unknown as TaskDetail}
          />
        </FormProvider>
      );
    }
    const view = await mount(<Runtime />);
    try {
      const deadline = view.container.querySelector<HTMLInputElement>(
        'input[name="deadlineDays"]',
      )!;
      const expiry = view.container.querySelector<HTMLSelectElement>(
        'select[name="expiryAction"]',
      )!;
      const reminders = view.container.querySelector<HTMLInputElement>(
        'input[name="reminderDayOffsets"]',
      )!;
      expect(deadline.value).toBe("10");
      expect(deadline.disabled).toBe(false);
      expect(expiry.value).toBe("CLOSE_REQUEST");
      expect(expiry.disabled).toBe(true);
      expect(Array.from(expiry.options).map((option) => option.value)).toEqual([
        "CLOSE_REQUEST",
      ]);
      expect(reminders.value).toBe("3, 7");
      expect(reminders.disabled).toBe(false);
      expect(
        view.container.querySelector(
          'input[name="runtimeOverrides.deadlineDays"]',
        ),
      ).toBeNull();
    } finally {
      await view.cleanup();
    }
  });
});
