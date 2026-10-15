import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type {
  ApplicationAppeal,
  ApplicationAppealSummary,
} from "../domain/ApplicationAppeal";
import type { ApplicationAppealInput } from "../api/ApplicationAppealSchemas";

export function appealTransaction<T>(
  operation: (transaction: DatabaseTransaction) => Promise<T>,
) {
  return getDatabase().transaction(operation);
}
export async function findAppealApplication(
  transaction: DatabaseTransaction,
  reference: string,
): Promise<{ id: string; reference: string } | undefined> {
  const result = await transaction.execute<{
    id: string;
    reference: string;
  }>(sql`
    SELECT id, reference FROM app_applications WHERE reference = ${reference} LIMIT 1
  `);
  return result.rows[0];
}
export async function createApplicationAppeal(
  transaction: DatabaseTransaction,
  applicationId: string,
  input: ApplicationAppealInput,
) {
  const result = await transaction.execute<{
    id: string;
    reference: string;
  }>(sql`
    INSERT INTO app_application_appeals(application_id, name, email, phone, grounds, details, consent)
    VALUES (${applicationId}::uuid, ${input.name}, ${input.email}, ${input.phone},
      ${input.grounds}, ${input.details}, ${input.consent})
    RETURNING id, 'APL-' || lpad(appeal_number::text, greatest(6, length(appeal_number::text)), '0') AS reference
  `);
  return result.rows[0]!;
}
export async function auditApplicationAppeal(
  transaction: DatabaseTransaction,
  id: string,
  actorId: string | null,
  action: string,
  changes: Record<string, unknown> = {},
) {
  await transaction.execute(sql`
    INSERT INTO app_application_appeal_audit(appeal_id, actor_id, action, changes)
    VALUES (${id}::uuid, ${actorId}::uuid, ${action}, ${JSON.stringify(changes)}::jsonb)
  `);
}
const summary = sql`c.id,
  'APL-' || lpad(c.appeal_number::text, greatest(6, length(c.appeal_number::text)), '0') AS reference,
  c.application_id AS "applicationId", a.reference AS "applicationReference", c.name, c.state,
  c.assigned_to AS "assignedTo", u.display_name AS "assigneeName",
  to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "createdAt",
  to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
  c.row_version AS "rowVersion"`;
export async function listApplicationAppeals(query: {
  after?: string;
  afterId?: string;
}) {
  const result = await getDatabase().execute<ApplicationAppealSummary>(sql`
    SELECT ${summary} FROM app_application_appeals c
    JOIN app_applications a ON a.id = c.application_id
    LEFT JOIN app_users u ON u.id = c.assigned_to
    ${query.after ? sql`WHERE (c.updated_at, c.id) < (${query.after}::timestamptz, ${query.afterId}::uuid)` : sql``}
    ORDER BY c.updated_at DESC, c.id DESC LIMIT 51
  `);
  return result.rows;
}
export async function readApplicationAppeal(
  id: string,
  transaction?: DatabaseTransaction,
) {
  const result = await (transaction ?? getDatabase())
    .execute<ApplicationAppeal>(sql`
    SELECT ${summary}, c.email, c.phone, c.grounds, c.details, c.resolution_note AS "resolutionNote"
    FROM app_application_appeals c JOIN app_applications a ON a.id = c.application_id
    LEFT JOIN app_users u ON u.id = c.assigned_to WHERE c.id = ${id}::uuid
  `);
  if (!result.rows[0]) throw new ResourceNotFoundError("application appeal");
  return result.rows[0];
}
export async function updateApplicationAppeal(
  transaction: DatabaseTransaction,
  id: string,
  expected: number,
  changes: { assignedTo: string | null } | { resolutionNote: string },
) {
  const update =
    "assignedTo" in changes
      ? sql`assigned_to = ${changes.assignedTo}::uuid,
        state = CASE WHEN state = 'NEW' AND ${changes.assignedTo}::uuid IS NOT NULL THEN 'IN_PROGRESS' ELSE state END`
      : sql`state = 'RESOLVED', resolution_note = ${changes.resolutionNote}, resolved_at = now()`;
  const result = await transaction.execute(sql`
    UPDATE app_application_appeals SET ${update}, updated_at = now(), row_version = row_version + 1
    WHERE id = ${id}::uuid AND row_version = ${expected} AND state <> 'RESOLVED' RETURNING id
  `);
  if (!result.rows.length)
    throw new ResourceConflictError(
      "The appeal changed or is resolved. Reload before saving.",
    );
}
