import "server-only";

import { sql } from "drizzle-orm";
import {
  notificationDeliveries,
  notificationOutbox,
} from "./notification.schema";
import type { NotificationOccurrenceTransaction } from "./NotificationOccurrenceRepository";
import type { WorkflowActionNotification } from "@/modules/workflows/domain/actions/WorkflowActionNotification";
import type { NotificationEventContextByKey } from "../domain/NotificationEvent";

type Recipient = {
  notificationId: string;
  userId: string;
  displayName: string;
  email: string;
  recipientType: WorkflowActionNotification["recipientType"];
};

export async function loadWorkflowActionNotificationRecipients(
  transaction: NotificationOccurrenceTransaction,
  input: {
    stageInstanceId: string;
    actorId: string;
    notifications: WorkflowActionNotification[];
  },
) {
  const result = await transaction.execute<
    Recipient & { stageName: string }
  >(sql`
    WITH configured AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(input.notifications)}::jsonb)
        AS row(id text, "recipientType" text, "recipientId" uuid)
    )
    SELECT DISTINCT configured.id AS "notificationId", recipient.id AS "userId",
      recipient.display_name AS "displayName", recipient.email,
      configured."recipientType" AS "recipientType", definition.name AS "stageName"
    FROM app_workflow_stage_instances stage
    JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    CROSS JOIN configured
    JOIN app_users recipient ON recipient.status = 'active' AND (
      (configured."recipientType" = 'APPLICATION_OWNER' AND recipient.id = application.owner_user_id)
      OR (configured."recipientType" = 'ACTION_ACTOR' AND recipient.id = ${input.actorId}::uuid)
      OR (configured."recipientType" = 'SPECIFIC_USER' AND recipient.id = configured."recipientId")
      OR (configured."recipientType" = 'SPECIFIC_ROLE' AND EXISTS (
        SELECT 1 FROM app_user_roles membership
        WHERE membership.user_id = recipient.id AND membership.role_id = configured."recipientId"
      ))
      OR (configured."recipientType" = 'ASSIGNED_USER' AND EXISTS (
        SELECT 1 FROM app_workflow_tasks task
        WHERE task.stage_instance_id = stage.id AND task.assigned_user_id = recipient.id
          AND task.status <> 'CANCELLED'
      ))
    )
    WHERE stage.id = ${input.stageInstanceId}::uuid
    ORDER BY configured.id, recipient.id
  `);
  return result.rows;
}

export type WorkflowActionEmailOccurrence = {
  id: string;
  occurrenceKey: string;
  context: NotificationEventContextByKey["workflow.action.notification"];
  recipients: Recipient[];
};

export async function insertWorkflowActionNotifications(
  transaction: NotificationOccurrenceTransaction,
  input: {
    applicationId: string;
    correlationId: string;
    occurrences: WorkflowActionEmailOccurrence[];
  },
) {
  if (!input.occurrences.length) return;
  const configuration = await transaction.execute<{
    eventId: string;
    channelId: string;
  }>(sql`
    SELECT event.id AS "eventId", channel.id AS "channelId"
    FROM app_notification_events event
    CROSS JOIN app_notification_channels channel
    WHERE event.event_key = 'workflow.action.notification' AND event.is_enabled
      AND channel.code = 'EMAIL' AND channel.is_enabled
    LIMIT 1
  `);
  const config = configuration.rows[0];
  if (!config)
    throw new Error(
      "Workflow action email notifications are not configured or enabled.",
    );
  const created = await transaction
    .insert(notificationOutbox)
    .values(
      input.occurrences.map((occurrence) => ({
        id: occurrence.id,
        aggregateId: input.applicationId,
        aggregateType: "APPLICATION",
        eventId: config.eventId,
        eventKey: "workflow.action.notification",
        correlationId: input.correlationId,
        occurrenceKey: occurrence.occurrenceKey,
        context: occurrence.context,
        status: "PENDING" as const,
      })),
    )
    .onConflictDoNothing({
      target: [notificationOutbox.eventKey, notificationOutbox.occurrenceKey],
    })
    .returning({ id: notificationOutbox.id });
  const createdIds = new Set(created.map((row) => row.id));
  const deliveries = input.occurrences
    .filter((row) => createdIds.has(row.id))
    .flatMap((occurrence) =>
      occurrence.recipients.map((recipient) => ({
        outboxId: occurrence.id,
        channelId: config.channelId,
        recipientUserId: recipient.userId,
        recipientName: recipient.displayName,
        recipientEmail: recipient.email,
        recipientType: recipient.recipientType,
        resolutionPath: `workflow-action:notification:${recipient.notificationId}`,
      })),
    );
  if (deliveries.length)
    await transaction.insert(notificationDeliveries).values(deliveries);
}
