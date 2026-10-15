import {
  seedApplicationDatabaseFixture,
  firstOwnerId,
  opportunityId,
} from "./application-database-fixture";
import { chatbotActor, chatbotId } from "./ChatbotKnowledgeFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
export const applicationId = chatbotId(910);
export const actor = {
  ...chatbotActor([
    permissionCodes.applicationAppealReadAll,
    permissionCodes.applicationAppealAssignAll,
    permissionCodes.applicationAppealResolveAll,
  ]),
  id: chatbotId(900),
};
export const input = {
  applicationReference: "APPEAL-TEST-2026-000001",
  name: "Public sender",
  email: "sender@example.test",
  phone: "",
  grounds: "<p><strong>Review grounds</strong></p>",
  details: "<p>Review details</p>",
  consent: true,
  company: "",
};
export async function installAppealDatabaseFixture(
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>,
) {
  const existing = await query(
    "SELECT id FROM app_applications WHERE id = $1",
    [applicationId],
  );
  if (existing.rows.length) {
    await query(
      `DELETE FROM app_notification_deliveries d USING app_notification_outbox o, app_application_appeals a
      WHERE d.outbox_id = o.id AND o.aggregate_id = a.id AND a.application_id = $1`,
      [applicationId],
    );
    await query(
      `DELETE FROM app_notification_outbox o USING app_application_appeals a
      WHERE o.aggregate_id = a.id AND a.application_id = $1`,
      [applicationId],
    );
    await query(
      `DELETE FROM app_application_appeal_audit audit USING app_application_appeals a
      WHERE audit.appeal_id = a.id AND a.application_id = $1`,
      [applicationId],
    );
    await query(
      "DELETE FROM app_application_appeals WHERE application_id = $1",
      [applicationId],
    );
    await query(
      `DELETE FROM app_notification_event_rule_recipients recipient USING app_notification_event_rules rule,
      app_notification_events event WHERE recipient.rule_id = rule.id AND rule.event_id = event.id
      AND event.event_key = 'application.appeal.received' AND recipient.recipient_user_id = $1`,
      [actor.id],
    );
    return;
  }
  await seedApplicationDatabaseFixture(query);
  await query(
    `INSERT INTO app_users(id, display_name, email, status, user_type) VALUES ($1, 'Appeal reviewer', 'review@example.test', 'active', 'staff')`,
    [actor.id],
  );
  await query(
    `UPDATE app_funding_calls call SET current_published_version_id = publication.id,
      opens_at = (publication.snapshot->>'opensAt')::timestamptz,
      closes_at = (publication.snapshot->>'closesAt')::timestamptz
    FROM app_funding_call_publication_revisions publication
    WHERE publication.funding_call_id = call.id AND call.id = $1`,
    [opportunityId],
  );
  await query(
    `INSERT INTO app_applications(id, owner_user_id, funding_opportunity_id, funding_opportunity_title, reference, status, submitted_at,
      funding_call_version_id, form_version_id, eligibility_rule_set_version_id)
    SELECT $1, $2, call.id, call.title, $4, 'submitted', now(),
      call.current_published_version_id, call.form_version_id, call.eligibility_rule_set_version_id
    FROM app_funding_calls call WHERE call.id = $3`,
    [applicationId, firstOwnerId, opportunityId, input.applicationReference],
  );
  await query(
    `INSERT INTO app_user_roles(user_id, role_id) SELECT $1, id FROM app_roles WHERE code = 'system_administrator'`,
    [actor.id],
  );
}
