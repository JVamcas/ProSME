import { act } from "react";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";

export const task = {
  actions: [
    {
      actionType: "APPROVE_ADVANCE",
      available: true,
      key: "ADVANCE",
      label: "Approve and advance",
      presentation: { displayOrder: 1, variant: "success" },
      requiredInput: {
        confirmation: { message: null, required: false },
        dueDate: { deadlineDays: null, required: false },
        editableFieldPaths: [],
        reason: { maxLength: 4_000, required: false },
        reviewDate: { required: false },
        target: { type: null, value: null },
      },
      runtimeVersion: 1,
      unavailableReason: null,
    },
  ],
  stageInstanceId: "stage-id",
  taskInstanceId: "task-id",
  taskStatus: "IN_PROGRESS",
  workflowInstanceId: "workflow-id",
} as unknown as TaskDetail;

export async function chooseAction(label: string) {
  await act(async () => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Workflow actions"]')
      ?.click();
  });
  await act(async () => {
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((item) => item.textContent?.includes(label))
      ?.click();
  });
}
