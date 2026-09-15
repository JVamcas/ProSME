import "server-only";

import { and, desc, eq, ilike } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries, roles, users } from "@/db/schema";
import type { AuthorizationAuditListInput } from "@/modules/users/UserAccessTypes";

export async function listAccessAudit(input: AuthorizationAuditListInput) {
  const conditions = input.action
    ? [ilike(authorizationAuditEntries.action, `%${input.action}%`)]
    : [];
  const rows = await getDatabase()
    .select({
      action: authorizationAuditEntries.action,
      actorId: authorizationAuditEntries.actorId,
      createdAt: authorizationAuditEntries.createdAt,
      id: authorizationAuditEntries.id,
      roleCode: authorizationAuditEntries.roleCode,
      targetRoleCode: roles.code,
      targetUserEmail: users.email,
    })
    .from(authorizationAuditEntries)
    .leftJoin(users, eq(users.id, authorizationAuditEntries.targetUserId))
    .leftJoin(roles, eq(roles.id, authorizationAuditEntries.targetRoleId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(authorizationAuditEntries.createdAt))
    .limit(input.limit);
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}
