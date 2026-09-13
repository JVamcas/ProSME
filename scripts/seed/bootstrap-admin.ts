import { and, eq, inArray } from "drizzle-orm";

import { getFirebaseAdminAuth } from "../../apps/platform/src/auth/firebase/admin";
import { getDatabase } from "../../apps/platform/src/db/client";
import {
  authorizationAuditEntries,
  roles,
  userIdentities,
  userRoles,
  users,
} from "../../apps/platform/src/db/schema";
import { syncCmsPrincipal } from "../../apps/platform/src/payload/system/sync-cms-principal";

const configuredEmail = process.env.BOOTSTRAP_ADMIN_EMAIL
  ?.trim()
  .toLowerCase();
const bootstrapRoleCodes = ["system_administrator", "applicant"] as const;

if (!configuredEmail) {
  throw new Error("BOOTSTRAP_ADMIN_EMAIL is required");
}
const email: string = configuredEmail;

const firebaseUser = await getFirebaseAdminAuth().getUserByEmail(email);
if (!firebaseUser.email || !firebaseUser.emailVerified) {
  throw new Error("The Firebase account must have a verified email address");
}

const database = getDatabase();
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
type Audit = typeof authorizationAuditEntries.$inferInsert;
const actorId = `bootstrap:${email}`;
const bootstrapRoles = await database
  .select()
  .from(roles)
  .where(inArray(roles.code, bootstrapRoleCodes));
if (bootstrapRoles.length !== bootstrapRoleCodes.length) {
  throw new Error(
    "Required bootstrap roles are missing. Apply the application migration first.",
  );
}

async function createAdminUser(transaction: Transaction) {
  const [created] = await transaction
    .insert(users)
    .values({
      email,
      displayName: firebaseUser.displayName || email,
      userType: "staff",
      status: "active",
    })
    .returning({ id: users.id });

  await transaction.insert(userIdentities).values({
    userId: created.id,
    provider: "firebase",
    subject: firebaseUser.uid,
    emailVerified: true,
  });

  return {
    userId: created.id,
    audit: [
      {
        action: "user.bootstrapped",
        actorId,
        targetUserId: created.id,
        changes: {
          status: "active",
          userType: "staff",
        },
      },
    ] satisfies Audit[],
  };
}

async function upsertAdminUser(transaction: Transaction) {
  const [identity] = await transaction
    .select({ userId: userIdentities.userId })
    .from(userIdentities)
    .where(
      and(
        eq(userIdentities.provider, "firebase"),
        eq(userIdentities.subject, firebaseUser.uid),
      ),
    )
    .limit(1);
  if (!identity) {
    return createAdminUser(transaction);
  }
  const [previous] = await transaction
    .select()
    .from(users)
    .where(eq(users.id, identity.userId))
    .limit(1);
  await transaction
    .update(users)
    .set({
      email,
      displayName: firebaseUser.displayName || email,
      userType: "staff",
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.id, identity.userId));
  await transaction
    .update(userIdentities)
    .set({ emailVerified: true, lastSeenAt: new Date() })
    .where(
      and(
        eq(userIdentities.provider, "firebase"),
        eq(userIdentities.subject, firebaseUser.uid),
      ),
    );
  const changed =
    previous && (previous.status !== "active" || previous.userType !== "staff");
  const audit: Audit[] = changed
    ? [
        {
          action: "user.status-changed",
          actorId,
          targetUserId: identity.userId,
          changes: {
            from: { status: previous.status, userType: previous.userType },
            to: { status: "active", userType: "staff" },
          },
        },
      ]
    : [];
  return {
    userId: identity.userId,
    audit,
  };
}

async function assignBootstrapRoles(transaction: Transaction, userId: string) {
  const assigned = await transaction
    .insert(userRoles)
    .values(bootstrapRoles.map((role) => ({ userId, roleId: role.id })))
    .onConflictDoNothing()
    .returning({ roleId: userRoles.roleId });

  const assignedIds = new Set(assigned.map((item) => item.roleId));
  return bootstrapRoles.flatMap((role): Audit[] => {
    if (!assignedIds.has(role.id)) {
      return [];
    }

    return [{
      action: "role.assigned",
      actorId,
      targetUserId: userId,
      roleCode: role.code,
    }];
  });
}

const applicationUserId = await database.transaction(async (transaction) => {
  const result = await upsertAdminUser(transaction);
  const audit = [
    ...result.audit,
    ...(await assignBootstrapRoles(transaction, result.userId)),
  ];

  if (audit.length) {
    await transaction.insert(authorizationAuditEntries).values(audit);
  }
  return result.userId;
});

await syncCmsPrincipal({
  applicationUserId,
  email,
  displayName: firebaseUser.displayName || email,
});

console.info(`Bootstrapped ${email} as ${bootstrapRoleCodes.join(" + ")}`);
process.exit(0);
