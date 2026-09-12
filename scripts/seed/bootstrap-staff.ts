import { and, eq } from "drizzle-orm";

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

const email = process.env.BOOTSTRAP_STAFF_EMAIL?.trim().toLowerCase();
const roleCode =
  process.env.BOOTSTRAP_STAFF_ROLE?.trim() || "system_administrator";

if (!email) throw new Error("BOOTSTRAP_STAFF_EMAIL is required");
if (roleCode === "applicant")
  throw new Error("The staff bootstrap cannot assign the applicant role");

const firebaseUser = await getFirebaseAdminAuth().getUserByEmail(email);
if (!firebaseUser.email || !firebaseUser.emailVerified) {
  throw new Error("The Firebase account must have a verified email address");
}

const database = getDatabase();
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
type Audit = typeof authorizationAuditEntries.$inferInsert;
const actorId = `bootstrap:${email}`;

const [role] = await database
  .select()
  .from(roles)
  .where(eq(roles.code, roleCode))
  .limit(1);
if (!role)
  throw new Error(
    `Unknown role: ${roleCode}. Apply the application migration first.`,
  );

async function upsertStaffUser(transaction: Transaction) {
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
    const [created] = await transaction
      .insert(users)
      .values({
        email: email!,
        displayName: firebaseUser.displayName || email!,
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
          changes: { status: "active", userType: "staff" },
        },
      ] satisfies Audit[],
    };
  }

  const [previous] = await transaction
    .select()
    .from(users)
    .where(eq(users.id, identity.userId))
    .limit(1);
  await transaction
    .update(users)
    .set({
      email: email!,
      displayName: firebaseUser.displayName || email!,
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
  return { userId: identity.userId, audit };
}

async function assignStaffRole(transaction: Transaction, userId: string) {
  const audit: Audit[] = [];
  const [applicantRole] = await transaction
    .select()
    .from(roles)
    .where(eq(roles.code, "applicant"))
    .limit(1);
  if (applicantRole) {
    const removed = await transaction
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, applicantRole.id),
        ),
      )
      .returning({ roleId: userRoles.roleId });
    if (removed.length)
      audit.push({
        action: "role.removed",
        actorId,
        targetUserId: userId,
        roleCode: "applicant",
      });
  }
  const assigned = await transaction
    .insert(userRoles)
    .values({ userId, roleId: role.id })
    .onConflictDoNothing()
    .returning({ roleId: userRoles.roleId });
  if (assigned.length)
    audit.push({
      action: "role.assigned",
      actorId,
      targetUserId: userId,
      roleCode,
    });
  return audit;
}

const applicationUserId = await database.transaction(async (transaction) => {
  const result = await upsertStaffUser(transaction);
  const audit = [
    ...result.audit,
    ...(await assignStaffRole(transaction, result.userId)),
  ];
  if (audit.length)
    await transaction.insert(authorizationAuditEntries).values(audit);
  return result.userId;
});

await syncCmsPrincipal({
  applicationUserId,
  email,
  displayName: firebaseUser.displayName || email,
});

console.info(`Bootstrapped ${email} as ${roleCode}`);
process.exit(0);
