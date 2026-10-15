import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { permissionCodes } from "@/auth/authorization/permissions";

function eligibleStaff() {
  return sql`u.status = 'active' AND u.user_type = 'staff' AND EXISTS (
    SELECT 1 FROM app_user_roles membership
    JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
    JOIN app_capabilities permission ON permission.id = grant_record.capability_id
    WHERE membership.user_id = u.id AND permission.code = ${permissionCodes.applicationAppealReadAll}
  )`;
}
export async function listAppealAssignees() {
  const result = await getDatabase().execute<{
    id: string;
    name: string;
    email: string;
  }>(sql`
    SELECT u.id, u.display_name AS name, u.email FROM app_users u
    WHERE ${eligibleStaff()} ORDER BY u.display_name, u.id LIMIT 500
  `);
  return result.rows;
}
export async function appealAssigneeCanRead(
  transaction: DatabaseTransaction,
  id: string,
) {
  const result = await transaction.execute(sql`
    SELECT EXISTS(SELECT 1 FROM app_users u WHERE u.id = ${id}::uuid AND ${eligibleStaff()}) AS allowed
  `);
  return result.rows[0]?.allowed === true;
}
