import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowActionNotification } from "@/modules/workflows/domain/actions/WorkflowActionNotification";
import { referenceWorkflow } from "./ReferenceWorkflowFixture";

export const actionNotificationFixture: WorkflowActionNotification = {
  id: "11111111-1111-4111-8111-111111111111",
  condition: null,
  recipientType: "APPLICATION_OWNER",
  recipientId: null,
  subject: "Decision for {{fundingcalltitle}}",
  body: "<p>Hello {{recipientname}}</p>",
};

export function actionNotificationsEditor(): WorkflowEditorView {
  const graph = structuredClone(referenceWorkflow);
  graph.stages[0].actions[0].notifications = [
    structuredClone(actionNotificationFixture),
  ];
  graph.stages[0].actions[1] = {
    ...graph.stages[0].actions[0],
    stableKey: "NO_NOTIFICATION",
    label: "No notification action",
    displayOrder: 2,
    notifications: [],
  };
  return {
    allowedActions: [],
    definition: {
      id: "definition",
      code: "REFERENCE",
      name: "Reference",
      description: "",
    },
    graph,
    assignmentOptions: { roles: [], users: [] },
    validation: { valid: true, errors: [], warnings: [] },
    version: {
      id: "version",
      number: 1,
      status: "DRAFT",
      rowVersion: 3,
      createdAt: "2026-10-15T00:00:00.000Z",
      publishedAt: null,
      retiredAt: null,
    },
  };
}
