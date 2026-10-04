import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { WorkflowEscalationTracking } from "@/modules/workflows/domain/runtime/WorkflowEscalationTracking";
import type { WorkflowTaskActions as ActionComponent } from "@/modules/workflows/ui/tasks/WorkflowTaskActions";
vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useCancelWorkflowEscalation: vi.fn(() => ({
    isPending: false,
    mutateAsync: vi.fn(),
  })),
}));
vi.mock("@/shared/ui/ConfirmationDialog", () => ({
  ConfirmationDialog: () => null,
}));
vi.mock("@/modules/workflows/ui/tasks/WorkflowTaskActions", () => ({
  WorkflowTaskActions: (props: Parameters<typeof ActionComponent>[0]) => (
    <nav aria-label="Actions">
      {props.actions.map((action) => (
        <button key={action.key} disabled={!action.available}>
          {action.label}
        </button>
      ))}
      {props.additionalItems?.map((item) => (
        <button key={item.id} disabled={item.disabled}>
          {item.label}
        </button>
      ))}
    </nav>
  ),
}));
import { WorkflowEscalationTrackingPanel } from "@/modules/workflows/ui/tasks/WorkflowEscalationTrackingPanel";
import { emptyWorkflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
const tracking: WorkflowEscalationTracking = {
  id: "escalation",
  taskId: "task",
  taskName: "Approve",
  stageName: "Finance review",
  assignedUserName: "Third reviewer",
  assignedRoleName: null,
  rowVersion: 3,
  canCancel: true,
  actions: [
    {
      actionType: "APPROVE_ADVANCE",
      key: "approve",
      label: "Approve",
      available: false,
      unavailableReason: "Assigned to another reviewer",
      presentation: { displayOrder: 1, variant: "success" },
      requiredInput: emptyWorkflowActionInputMetadata,
      runtimeVersion: 3,
    },
  ],
};
it("keeps normal actions disabled and adds cancellation to the same Actions control", () => {
  const markup = renderToStaticMarkup(
    <WorkflowEscalationTrackingPanel task={tracking} />,
  );
  expect(markup).toContain('aria-label="Actions"');
  expect(markup).toContain('<button disabled="">Approve</button>');
  expect(markup).toContain("<button>Cancel escalation</button>");
  expect(markup).toContain("Third reviewer");
});
it("disables cancellation after committed work or when permission is absent", () => {
  const markup = renderToStaticMarkup(
    <WorkflowEscalationTrackingPanel
      task={{ ...tracking, canCancel: false }}
    />,
  );
  expect(markup).toContain('<button disabled="">Cancel escalation</button>');
});
