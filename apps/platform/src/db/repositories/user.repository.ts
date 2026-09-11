import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  capabilities,
  roleCapabilities,
  roles,
  userIdentities,
  userRoles,
  users,
} from "@/db/schema";
import type { AuthenticatedUser } from "@/auth/types";

export type VerifiedIdentity = {
  subject: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export async function findUserByFirebaseSubject(subject: string): Promise<AuthenticatedUser | null> {
  const database = getDatabase();
  const rows = await database
    .select({
      user: users,
      identitySubject: userIdentities.subject,
      capability: capabilities.code,
    })
    .from(userIdentities)
    .innerJoin(users, eq(users.id, userIdentities.userId))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roleCapabilities, eq(roleCapabilities.roleId, userRoles.roleId))
    .leftJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(and(eq(userIdentities.provider, "firebase"), eq(userIdentities.subject, subject)));

  if (rows.length === 0) return null;

  return {
    ...rows[0].user,
    identitySubject: rows[0].identitySubject,
    capabilities: new Set(rows.flatMap((row) => (row.capability ? [row.capability] : []))),
  };
}

export async function provisionApplicant(identity: VerifiedIdentity): Promise<AuthenticatedUser> {
  const existing = await findUserByFirebaseSubject(identity.subject);
  if (existing) {
    await getDatabase()
      .update(userIdentities)
      .set({ emailVerified: identity.emailVerified, lastSeenAt: new Date() })
      .where(and(eq(userIdentities.provider, "firebase"), eq(userIdentities.subject, identity.subject)));
    return (await findUserByFirebaseSubject(identity.subject))!;
  }

  await getDatabase().transaction(async (transaction) => {
    const [user] = await transaction
      .insert(users)
      .values({
        email: identity.email.toLowerCase(),
        displayName: identity.displayName || identity.email,
        userType: "applicant",
        status: "active",
        lastLoginAt: new Date(),
      })
      .returning();

    await transaction.insert(userIdentities).values({
      userId: user.id,
      provider: "firebase",
      subject: identity.subject,
      emailVerified: identity.emailVerified,
      lastSeenAt: new Date(),
    });

    const [applicantRole] = await transaction.select().from(roles).where(eq(roles.code, "applicant")).limit(1);
    if (!applicantRole) throw new Error("The applicant role has not been seeded");

    await transaction.insert(userRoles).values({ userId: user.id, roleId: applicantRole.id });
  });

  const created = await findUserByFirebaseSubject(identity.subject);
  if (!created) throw new Error("Applicant provisioning did not create an application user");
  return created;
}
