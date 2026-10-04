import { permissionCodes } from "@/auth/authorization/permissions";

type DatabaseQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export const submissionReviewerId = "61111111-1111-4111-8111-111111111112";

export async function installSubmissionReviewer(query: DatabaseQuery) {
  const roleId = "61111111-1111-4111-8111-111111111113";
  const permissions = [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAssignedProcess,
    permissionCodes.workflowTaskAssignedDecide,
  ];
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'submission-reviewer@example.test', 'Submission Reviewer', 'staff', 'active')`,
    [submissionReviewerId],
  );
  await query(
    `INSERT INTO app_roles (id, code, name)
     VALUES ($1, 'submission_test_reviewer', 'Submission test reviewer')`,
    [roleId],
  );
  await query(
    `INSERT INTO app_capabilities (code)
     SELECT unnest($1::text[]) ON CONFLICT (code) DO NOTHING`,
    [permissions],
  );
  await query(
    `INSERT INTO app_role_capabilities (role_id, capability_id)
     SELECT $1, id FROM app_capabilities WHERE code = ANY($2::text[])`,
    [roleId, permissions],
  );
  await query(`INSERT INTO app_user_roles (user_id, role_id) VALUES ($1, $2)`, [
    submissionReviewerId,
    roleId,
  ]);
}
