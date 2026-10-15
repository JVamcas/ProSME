import { workflowActionEmailContextSchema } from "../domain/NotificationWorkflowActionEvent";
import { actionNotificationParameters } from "@/modules/workflows/domain/actions/WorkflowActionNotification";
import { renderNotificationTemplate } from "./NotificationTemplateRenderer";
import { sanitizeNotificationHtml } from "./NotificationHtmlImport";

export function renderWorkflowActionEmail(
  context: unknown,
  recipientName: string,
) {
  const value = workflowActionEmailContextSchema.parse(context);
  return renderNotificationTemplate(
    {
      subjectTemplate: value.subjectTemplate,
      htmlTemplate: sanitizeNotificationHtml(value.htmlTemplate),
      plainTextTemplate: value.plainTextTemplate,
    },
    actionNotificationParameters.map((parameter) => parameter.value),
    {
      fundingcalltitle: value.fundingOpportunityTitle,
      applicationreference: value.applicationReference,
      stagename: value.stageName,
      actionlabel: value.actionLabel,
      actorname: value.actorName,
      recipientname: recipientName,
    },
  );
}
