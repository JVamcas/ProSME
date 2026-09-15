import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  authorizationAuditEntries,
  capabilities,
  roleCapabilities,
  roles,
  userIdentities,
  userRoles,
  users,
} from "@/db/schema";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import type {
  RoleUpdateInput,
  UserAccessListInput,
  UserAccessUpdateInput,
  UserInviteInput,
} from "@/modules/users/UserAccessTypes";

function unique(values: string[]) {
  return [...new Set(values)];
}

function aggregateCodes(column: typeof roles.code | typeof capabilities.code) {
  return sql<string[]>`
    coalesce(
      array_agg(distinct ${column}) filter (where ${column} is not null),
      '{}'::text[]
    )
  `;
}

export async function listAccessUsers(input: UserAccessListInput) {
  const filters = [];
  if (input.status) filters.push(eq(users.status, input.status));
  if (input.search) {
    const term = `%${input.search}%`;
    filters.push(sql`(${users.email} ILIKE ${term} OR ${users.displayName} ILIKE ${term})`);
  }

  const rows = await getDatabase()
    .select({
      capabilityCodes: aggregateCodes(capabilities.code),
      displayName: users.displayName,
      email: users.email,
      emailVerified: sql<boolean>`coalesce(bool_or(${userIdentities.emailVerified}), false)`,
      id: users.id,
      lastLoginAt: users.lastLoginAt,
      roleCodes: aggregateCodes(roles.code),
      status: users.status,
      userType: users.userType,
    })
    .from(users)
    .leftJoin(
      userIdentities,
      and(eq(userIdentities.userId, users.id), eq(userIdentities.provider, "firebase")),
    )
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(roleCapabilities, eq(roleCapabilities.roleId, roles.id))
    .leftJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(filters.length ? and(...filters) : undefined)
    .groupBy(users.id)
    .orderBy(asc(users.displayName), asc(users.email))
    .limit(input.limit);

  return rows.map((row) => ({
    ...row,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  }));
}

export async function listAccessRoles() {
  const rows = await getDatabase()
    .select({
      assignedUserCount: sql<number>`count(distinct ${userRoles.userId})::integer`,
      capabilityCodes: aggregateCodes(capabilities.code),
      code: roles.code,
      description: roles.description,
      id: roles.id,
      name: roles.name,
    })
    .from(roles)
    .leftJoin(roleCapabilities, eq(roleCapabilities.roleId, roles.id))
    .leftJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
    .groupBy(roles.id)
    .orderBy(asc(roles.name));

  return rows;
}

export async function listAccessCapabilities() {
  return getDatabase()
    .select({ code: capabilities.code, description: capabilities.description })
    .from(capabilities)
    .orderBy(asc(capabilities.code));
}

export async function findAccessUser(userId: string) {
  const [row] = await getDatabase()
    .select({
      capabilityCodes: aggregateCodes(capabilities.code),
      displayName: users.displayName,
      email: users.email,
      emailVerified: sql<boolean>`coalesce(bool_or(${userIdentities.emailVerified}), false)`,
      id: users.id,
      lastLoginAt: users.lastLoginAt,
      status: users.status,
      roleCodes: aggregateCodes(roles.code),
      userType: users.userType,
    })
    .from(users)
    .leftJoin(
      userIdentities,
      and(
        eq(userIdentities.userId, users.id),
        eq(userIdentities.provider, "firebase"),
      ),
    )
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(roleCapabilities, eq(roleCapabilities.roleId, roles.id))
    .leftJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(eq(users.id, userId))
    .groupBy(users.id)
    .limit(1);
  return row
    ? { ...row, lastLoginAt: row.lastLoginAt?.toISOString() ?? null }
    : null;
}

async function resolveRoles(transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0], codes: string[]) {
  const requested = unique(codes);
  const found = requested.length
    ? await transaction
        .select({ code: roles.code, id: roles.id })
        .from(roles)
        .where(inArray(roles.code, requested))
    : [];
  if (found.length !== requested.length) {
    throw new ResourceNotFoundError("one or more roles");
  }
  return { codes: requested, rows: found };
}

async function protectSystemAdministrator(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  targetUserId: string,
  nextStatus: string | undefined,
  nextRoleCodes: string[] | undefined,
) {
  const isTargetSystemAdmin = await transaction.execute(sql`
    SELECT 1
    FROM app_user_roles ur
    JOIN app_roles r ON r.id = ur.role_id
    WHERE ur.user_id = ${targetUserId}::uuid
      AND r.code = 'system_administrator'
    LIMIT 1
  `);
  if (!isTargetSystemAdmin.rows.length) return;

  const removesRole = nextRoleCodes && !nextRoleCodes.includes("system_administrator");
  const disablesUser = nextStatus && nextStatus !== "active";
  if (!removesRole && !disablesUser) return;

  const remaining = await transaction.execute(sql`
    SELECT count(*)::integer AS count
    FROM app_users u
    JOIN app_user_roles ur ON ur.user_id = u.id
    JOIN app_roles r ON r.id = ur.role_id
    WHERE u.id <> ${targetUserId}::uuid
      AND u.status = 'active'
      AND r.code = 'system_administrator'
  `);
  if (Number((remaining.rows[0] as { count: number }).count) < 1) {
    throw new ResourceConflictError("At least one active system administrator is required.");
  }
}

export async function updateAccessUser(
  actorId: string,
  userId: string,
  input: UserAccessUpdateInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [before] = await transaction
      .select({
        emailVerified: sql<boolean>`coalesce(bool_or(${userIdentities.emailVerified}), false)`,
        status: users.status,
        userType: users.userType,
      })
      .from(users)
      .leftJoin(
        userIdentities,
        and(eq(userIdentities.userId, users.id), eq(userIdentities.provider, "firebase")),
      )
      .where(eq(users.id, userId))
      .groupBy(users.id)
      .limit(1);
    if (!before) throw new ResourceNotFoundError("user");
    if (input.status === "active" && !before.emailVerified) {
      throw new ResourceConflictError("Only a verified Firebase user can be activated.");
    }
    if (actorId === userId && input.status && input.status !== "active") {
      throw new ResourceConflictError("You cannot deactivate your own account.");
    }

    const resolved = input.roleCodes
      ? await resolveRoles(transaction, input.roleCodes)
      : null;
    await protectSystemAdministrator(transaction, userId, input.status, input.roleCodes);

    const [updated] = await transaction
      .update(users)
      .set({
        ...(input.status ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!updated) throw new ResourceNotFoundError("user");

    const changes: Record<string, unknown> = {};
    if (input.status && input.status !== before.status) {
      changes.status = { from: before.status, to: input.status };
    }
    if (resolved) {
      await transaction.delete(userRoles).where(eq(userRoles.userId, userId));
      if (resolved.rows.length) {
        await transaction.insert(userRoles).values(
          resolved.rows.map((role) => ({ roleId: role.id, userId })),
        );
      }
      changes.roleCodes = resolved.codes;
    }
    if (Object.keys(changes).length) {
      await transaction.insert(authorizationAuditEntries).values({
        action: resolved ? "user.access.updated" : "user.status.changed",
        actorId,
        changes,
        targetUserId: userId,
      });
    }
    return updated.id;
  });
}

export async function promoteAccessUser(
  actorId: string,
  userId: string,
  roleCodes: string[],
) {
  return getDatabase().transaction(async (transaction) => {
    const [before] = await transaction
      .select({ status: users.status, userType: users.userType })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!before) throw new ResourceNotFoundError("user");
    const [identity] = await transaction
      .select({ emailVerified: userIdentities.emailVerified })
      .from(userIdentities)
      .where(and(eq(userIdentities.userId, userId), eq(userIdentities.provider, "firebase")))
      .limit(1);
    if (!identity?.emailVerified) {
      throw new ResourceConflictError("Only a verified Firebase user can be promoted.");
    }
    const resolved = await resolveRoles(transaction, roleCodes);
    await transaction
      .update(users)
      .set({ status: "active", userType: "staff", updatedAt: new Date() })
      .where(eq(users.id, userId));
    await transaction.delete(userRoles).where(eq(userRoles.userId, userId));
    await transaction.insert(userRoles).values(
      resolved.rows.map((role) => ({ roleId: role.id, userId })),
    );
    await transaction.insert(authorizationAuditEntries).values({
      action: "user.promoted",
      actorId,
      changes: {
        from: { status: before.status, userType: before.userType },
        roleCodes: resolved.codes,
        to: { status: "active", userType: "staff" },
      },
      targetUserId: userId,
    });
    return userId;
  });
}

export async function inviteAccessUser(
  actorId: string,
  input: UserInviteInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const email = input.email.toLowerCase();
    const [existing] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) throw new ResourceConflictError("A user with this email already exists.");
    const resolved = await resolveRoles(transaction, input.roleCodes);
    const [created] = await transaction
      .insert(users)
      .values({
        displayName: input.displayName,
        email,
        status: "invited",
        userType: "staff",
      })
      .returning({ id: users.id });
    await transaction.insert(userRoles).values(
      resolved.rows.map((role) => ({ roleId: role.id, userId: created.id })),
    );
    await transaction.insert(authorizationAuditEntries).values({
      action: "user.invited",
      actorId,
      changes: { email, roleCodes: resolved.codes, status: "invited" },
      targetUserId: created.id,
    });
    return created.id;
  });
}

export async function updateAccessRole(
  actorId: string,
  roleId: string,
  input: RoleUpdateInput,
) {
  return getDatabase().transaction(async (transaction) => {
    const [role] = await transaction
      .select({ code: roles.code })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (!role) throw new ResourceNotFoundError("role");
    const requested = unique(input.capabilityCodes);
    const found = requested.length
      ? await transaction
          .select({ id: capabilities.id, code: capabilities.code })
          .from(capabilities)
          .where(inArray(capabilities.code, requested))
      : [];
    if (found.length !== requested.length) {
      throw new ResourceNotFoundError("one or more capabilities");
    }
    if (
      role.code === "system_administrator" &&
      (!requested.includes("user.manage") || !requested.includes("role.manage"))
    ) {
      throw new ResourceConflictError(
        "System administrators must retain user management access.",
      );
    }
    await transaction
      .update(roles)
      .set({ description: input.description, name: input.name })
      .where(eq(roles.id, roleId));
    await transaction.delete(roleCapabilities).where(eq(roleCapabilities.roleId, roleId));
    if (found.length) {
      await transaction.insert(roleCapabilities).values(
        found.map((capability) => ({ capabilityId: capability.id, roleId })),
      );
    }
    await transaction.insert(authorizationAuditEntries).values({
      action: "role.capabilities.updated",
      actorId,
      changes: { capabilityCodes: requested, name: input.name },
      targetRoleId: roleId,
    });
    return roleId;
  });
}
