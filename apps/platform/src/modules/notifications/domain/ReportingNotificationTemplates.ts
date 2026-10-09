import type { ReportingEventKey } from "./NotificationReportingEvent";

export const reportingEmailTemplates: Record<
  ReportingEventKey,
  { subject: string; html: string; plainText: string }
> = {
  "reporting.generation.started": {
    subject: "Report generation started: {{reportName}}",
    html: '<html><body><p>Hello {{recipientName}},</p><p>{{reportName}} started at {{occurredAt}}.</p><p>Period: {{startDate}} to {{endDate}} ({{timezone}}). Trigger: {{trigger}}.</p><p>Run: {{runId}}</p><p><a href="{{reportUrl}}">View report</a></p></body></html>',
    plainText:
      "Hello {{recipientName}},\n{{reportName}} started at {{occurredAt}}.\nPeriod: {{startDate}} to {{endDate}} ({{timezone}}). Trigger: {{trigger}}.\nRun: {{runId}}\n{{reportUrl}}",
  },
  "reporting.generation.completed": {
    subject: "Report generated: {{reportName}}",
    html: '<html><body><p>Hello {{recipientName}},</p><p>{{reportName}} completed at {{occurredAt}}. The saved report is attached.</p><p>Period: {{startDate}} to {{endDate}} ({{timezone}}).</p><p>Rows: {{rows}}. Duration: {{durationSeconds}} seconds. Run: {{runId}}</p><p><a href="{{reportUrl}}">View report</a></p></body></html>',
    plainText:
      "Hello {{recipientName}},\n{{reportName}} completed at {{occurredAt}}. The saved report is attached.\nPeriod: {{startDate}} to {{endDate}} ({{timezone}}).\nRows: {{rows}}. Duration: {{durationSeconds}} seconds. Run: {{runId}}\n{{reportUrl}}",
  },
  "reporting.generation.failed": {
    subject: "Report generation failed: {{reportName}}",
    html: '<html><body><p>Hello {{recipientName}},</p><p>{{reportName}} failed at {{occurredAt}}. The saved error file is attached.</p><p>Period: {{startDate}} to {{endDate}} ({{timezone}}). Run: {{runId}}</p><p><a href="{{reportUrl}}">View report</a></p></body></html>',
    plainText:
      "Hello {{recipientName}},\n{{reportName}} failed at {{occurredAt}}. The saved error file is attached.\nPeriod: {{startDate}} to {{endDate}} ({{timezone}}). Run: {{runId}}\n{{reportUrl}}",
  },
};
