import type { NotificationCatalogKey } from "./NotificationEvent";

export type NotificationCatalogSeed = {
  description: string;
  displayName: string;
  id: string;
  key: NotificationCatalogKey;
  sortOrder: number;
};

export const notificationCatalogSeeds: readonly NotificationCatalogSeed[] = [
  {
    key: "CHATBOT",
    displayName: "Chatbot",
    description: "Protected programme guidance follow-up.",
    id: "00000000-0000-4000-8000-000000000406",
    sortOrder: 35,
  },
  {
    description: "Report generation and delivery lifecycle.",
    displayName: "Reporting",
    id: "00000000-0000-4000-8000-000000000405",
    key: "REPORTING",
    sortOrder: 30,
  },
  {
    description: "Mandatory account verification and recovery emails.",
    displayName: "Authentication",
    id: "00000000-0000-4000-8000-000000000404",
    key: "AUTHENTICATION",
    sortOrder: 5,
  },
  {
    description: "Funding application lifecycle notification events.",
    displayName: "Applications",
    id: "00000000-0000-4000-8000-000000000401",
    key: "APPLICATIONS",
    sortOrder: 10,
  },
  {
    description: "Workflow runtime notification events.",
    displayName: "Workflow",
    id: "00000000-0000-4000-8000-000000000402",
    key: "WORKFLOW",
    sortOrder: 20,
  },
  {
    description: "Funding call governance and publication lifecycle events.",
    displayName: "Funding calls",
    id: "00000000-0000-4000-8000-000000000403",
    key: "FUNDING_CALLS",
    sortOrder: 15,
  },
];
