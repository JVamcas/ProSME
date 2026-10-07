export const websiteReportEventSeeds = [
  {
    catalogKey: "REPORTING",
    description: "A completed 14-day website analytics report is ready.",
    displayName: "Bi-weekly website report",
    id: "00000000-0000-4000-8000-000000000227",
    key: "reporting.website.biweekly",
    ruleId: "00000000-0000-4000-8000-000000000327",
    ruleChannelId: "00000000-0000-4000-8000-000000000627",
    ruleRecipientId: "00000000-0000-4000-8000-000000000727",
  },
  {
    catalogKey: "REPORTING",
    description:
      "A completed calendar-month website analytics report is ready.",
    displayName: "Monthly website report",
    id: "00000000-0000-4000-8000-000000000228",
    key: "reporting.website.monthly",
    ruleId: "00000000-0000-4000-8000-000000000328",
    ruleChannelId: "00000000-0000-4000-8000-000000000628",
    ruleRecipientId: "00000000-0000-4000-8000-000000000728",
  },
] as const;

export const websiteReportTemplateSeeds = [
  {
    defaultSubjectTemplate: "Bi-weekly website report: {{reportPeriod}}",
    eventKey: "reporting.website.biweekly",
    id: "00000000-0000-4000-8000-000000000532",
    scope: "EVENT",
  },
  {
    defaultSubjectTemplate: "Monthly website report: {{reportPeriod}}",
    eventKey: "reporting.website.monthly",
    id: "00000000-0000-4000-8000-000000000533",
    scope: "EVENT",
  },
] as const;
