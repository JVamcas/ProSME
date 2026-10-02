// Recipient and channel defaults are installed once by the migration.
// Seeding must preserve the rule subsequently edited through the UI.
export const applicationTerminalStatusEventSeed = {
  catalogKey: "APPLICATIONS",
  description: "An application reached a terminal status, including automatic eligibility failure.",
  displayName: "Application reached terminal status",
  id: "00000000-0000-4000-8000-000000000220",
  key: "application.terminal-status-reached",
  ruleChannelId: "00000000-0000-4000-8000-000000000620",
  ruleId: "00000000-0000-4000-8000-000000000320",
  ruleRecipientId: "00000000-0000-4000-8000-000000000720",
} as const;

export const applicationTerminalStatusTemplateSeed = {
  defaultSubjectTemplate: "Application {{applicationReference}}: {{statusLabel}}",
  eventKey: "application.terminal-status-reached",
  id: "00000000-0000-4000-8000-000000000525",
  scope: "EVENT",
} as const;
