import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type { AuthenticatedUser } from "@/auth/types";

// Worker and download checks use current PostgreSQL grants, independent of captured inputs.
export async function findReportingPrincipal(
  id: string,
): Promise<AuthenticatedUser | null> {
  const result = await getDatabase().execute<{
    id: string;
    displayName: string;
    status: AuthenticatedUser["status"];
    codes: string[];
  }>(sql`
    SELECT actor.id, actor.display_name AS "displayName", actor.status,
      ARRAY(SELECT DISTINCT permission.code FROM app_user_roles membership
        JOIN app_role_capabilities grant_record ON grant_record.role_id = membership.role_id
        JOIN app_capabilities permission ON permission.id = grant_record.capability_id
        WHERE membership.user_id = actor.id) AS codes
    FROM app_users actor WHERE actor.id = ${id}::uuid
  `);
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  // An authorization-only principal. No credentials, contact data or profile are needed.
  return {
    id: row.id,
    displayName: row.displayName,
    status: row.status,
    capabilities: new Set(row.codes),
    roleCodes: new Set(),
    identitySubject: "",
    email: "",
    userType: "staff",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    lastLoginAt: null,
  };
}
