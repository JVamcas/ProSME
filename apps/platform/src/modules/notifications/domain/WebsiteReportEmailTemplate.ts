export const websiteReportEmailTemplate = {
  subjectTemplate: "{{reportFrequency}} website report: {{reportPeriod}}",
  htmlTemplate: `<html><body style="background:#f6f4e2;color:#0a183b;font-family:Arial,sans-serif;padding:24px">
<div style="max-width:680px;margin:auto;background:#ffffff;padding:28px;border-top:6px solid #c9a24d">
<img src="{{brandingLogoUrl}}" alt="SME Fund Namibia" width="160" />
<h1>{{reportFrequency}} website analytics</h1><p>{{reportPeriod}}</p>
<p>Hello {{recipientName}},</p>
<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.6">{{reportSummary}}</pre>
<h2>Sources and coverage</h2>
<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;line-height:1.6">{{sourceNotes}}</pre>
<p><a href="{{reportUrl}}">View saved report</a></p></div></body></html>`,
  plainTextTemplate: `{{reportFrequency}} website analytics
{{reportPeriod}}

Hello {{recipientName}},

{{reportSummary}}

Sources and coverage
{{sourceNotes}}

View saved report: {{reportUrl}}`,
};
