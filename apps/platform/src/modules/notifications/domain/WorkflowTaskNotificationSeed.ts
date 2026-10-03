export const workflowEscalationEventSeed = {
  catalogKey: "WORKFLOW",
  description: "A workflow task was escalated and transferred to a new assignee.",
  displayName: "Workflow task escalated",
  id: "00000000-0000-4000-8000-000000000225",
  key: "workflow.task.escalated",
  recipientType: "ASSIGNED_USER",
  ruleChannelId: "00000000-0000-4000-8000-000000000625",
  ruleId: "00000000-0000-4000-8000-000000000325",
  ruleRecipientId: "00000000-0000-4000-8000-000000000725",
} as const;

export const workflowEscalationTemplateSeed = {
    defaultSubjectTemplate: "Task escalated to you for application {{applicationReference}}",
    eventKey: "workflow.task.escalated",
    id: "00000000-0000-4000-8000-000000000530",
    scope: "EVENT",
  } as const;

export const workflowTaskAssignedEventSeed = {
    catalogKey: "WORKFLOW",
    description: "Workflow tasks were assigned to one or more users.",
    displayName: "Workflow task assigned",
    id: "00000000-0000-4000-8000-000000000202",
    key: "workflow.task.assigned",
    recipientType: "ASSIGNED_USER",
    ruleChannelId: "00000000-0000-4000-8000-000000000602",
    ruleId: "00000000-0000-4000-8000-000000000302",
    ruleRecipientId: "00000000-0000-4000-8000-000000000702",
  } as const;
