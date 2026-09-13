import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  capabilities,
  applicantProfiles,
  businessProfiles,
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

type UserProjection = {
  businessProfileComplete: boolean;
  capabilityCodes: string[];
  createdAt: Date;
  displayName: string;
  email: string;
  id: string;
  identitySubject: string;
  lastLoginAt: Date | null;
  profileComplete: boolean;
  roleCodes: string[];
  status: AuthenticatedUser["status"];
  updatedAt: Date;
  userType: AuthenticatedUser["userType"];
};

function toAuthenticatedUser(row: UserProjection): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    userType: row.userType,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
    identitySubject: row.identitySubject,
    profileComplete: row.profileComplete,
    businessProfileComplete: row.businessProfileComplete,
    capabilities: new Set(row.capabilityCodes),
    roleCodes: new Set(row.roleCodes),
  };
}

export async function findUserByFirebaseSubject(
  subject: string,
): Promise<AuthenticatedUser | null> {
  const database = getDatabase();
  const [row] = await database
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      userType: users.userType,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
      identitySubject: userIdentities.subject,
      profileComplete: sql<boolean>`exists(
        select 1 from ${applicantProfiles}
        where ${applicantProfiles.userId} = ${users.id}
          and length(trim(${applicantProfiles.firstName})) > 0
          and length(trim(${applicantProfiles.surname})) > 0
          and length(trim(${applicantProfiles.position})) > 0
          and length(trim(${applicantProfiles.phoneNumber})) > 0
          and length(trim(${applicantProfiles.nationality})) > 0
          and length(trim(${applicantProfiles.region})) > 0
      )`,
      businessProfileComplete: sql<boolean>`exists(
        select 1 from ${businessProfiles}
        where ${businessProfiles.userId} = ${users.id}
      )`,
      capabilityCodes: sql<string[]>`
        coalesce(
          array_agg(distinct ${capabilities.code})
            filter (where ${capabilities.code} is not null),
          '{}'::text[]
        )
      `,
      roleCodes: sql<string[]>`
        coalesce(
          array_agg(distinct ${roles.code})
            filter (where ${roles.code} is not null),
          '{}'::text[]
        )
      `,
    })
    .from(userIdentities)
    .innerJoin(users, eq(users.id, userIdentities.userId))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(roleCapabilities, eq(roleCapabilities.roleId, userRoles.roleId))
    .leftJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
    .where(
      and(
        eq(userIdentities.provider, "firebase"),
        eq(userIdentities.subject, subject),
      ),
    )
    .groupBy(users.id, userIdentities.subject)
    .limit(1);

  if (!row) {
    return null;
  }

  return toAuthenticatedUser(row);
}

async function requireResolvedUser(subject: string) {
  const user = await findUserByFirebaseSubject(subject);

  if (!user) {
    throw new Error("Applicant provisioning did not resolve an application user");
  }

  return user;
}

async function touchIdentity(
  identity: VerifiedIdentity,
): Promise<boolean> {
  return getDatabase().transaction(async (transaction) => {
    const now = new Date();
    const [existingIdentity] = await transaction
      .update(userIdentities)
      .set({
        emailVerified: identity.emailVerified,
        lastSeenAt: now,
      })
      .where(
        and(
          eq(userIdentities.provider, "firebase"),
          eq(userIdentities.subject, identity.subject),
        ),
      )
      .returning({ userId: userIdentities.userId });

    if (!existingIdentity) {
      return false;
    }

    await transaction
      .update(users)
      .set({
        email: identity.email.toLowerCase(),
        displayName: identity.displayName || identity.email,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, existingIdentity.userId));

    return true;
  });
}

async function createApplicantIdentity(identity: VerifiedIdentity) {
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
      .onConflictDoUpdate({
        target: users.email,
        set: {
          displayName: identity.displayName || identity.email,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning({
        id: users.id,
        userType: users.userType,
      });

    const [linkedIdentity] = await transaction
      .insert(userIdentities)
      .values({
        userId: user.id,
        provider: "firebase",
        subject: identity.subject,
        emailVerified: identity.emailVerified,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userIdentities.provider, userIdentities.subject],
        set: {
          emailVerified: identity.emailVerified,
          lastSeenAt: new Date(),
        },
      })
      .returning({ userId: userIdentities.userId });

    if (user.userType !== "applicant") {
      return;
    }

    await transaction.execute(sql`
      INSERT INTO "app_user_roles" ("user_id", "role_id")
      SELECT ${linkedIdentity.userId}::uuid, ${roles.id}
      FROM ${roles}
      WHERE ${roles.code} = 'applicant'
      ON CONFLICT DO NOTHING
    `);
  });
}

export async function provisionApplicant(
  identity: VerifiedIdentity,
): Promise<AuthenticatedUser> {
  const identityExists = await touchIdentity(identity);

  if (!identityExists) {
    await createApplicantIdentity(identity);
  }

  return requireResolvedUser(identity.subject);
}
