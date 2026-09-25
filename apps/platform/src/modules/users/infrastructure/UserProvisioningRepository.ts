import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  authorizationAuditEntries,
  roles,
  userIdentities,
  userRoles,
  users,
} from "@/db/schema";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";

export type DirectoryApplicantIdentity = {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export async function provisionDirectoryApplicant(
  actorId: string,
  identity: DirectoryApplicantIdentity,
) {
  return getDatabase().transaction(async (transaction) => {
    const email = identity.email.trim().toLowerCase();
    const [created] = await transaction
      .insert(users)
      .values({
        email,
        displayName: identity.displayName.trim() || email,
        status: "active",
        userType: "applicant",
      })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });

    if (!created) {
      throw new ResourceConflictError("This email already has a platform account.");
    }

    const [linked] = await transaction
      .insert(userIdentities)
      .values({
        userId: created.id,
        provider: "firebase",
        subject: identity.uid,
        emailVerified: identity.emailVerified,
      })
      .onConflictDoNothing({
        target: [userIdentities.provider, userIdentities.subject],
      })
      .returning({ id: userIdentities.id });

    if (!linked) {
      throw new ResourceConflictError("This Firebase user is already provisioned.");
    }

    const assigned = await transaction.execute(sql`
      INSERT INTO app_user_roles (user_id, role_id)
      SELECT ${created.id}::uuid, ${roles.id}
      FROM ${roles}
      WHERE ${roles.code} = 'applicant'
      RETURNING user_id
    `);

    if (!assigned.rows.length) {
      throw new ResourceNotFoundError("applicant role");
    }

    await transaction.insert(authorizationAuditEntries).values({
      action: "user.provisioned",
      actorId,
      targetUserId: created.id,
      changes: {
        email,
        firebaseUid: identity.uid,
        emailVerified: identity.emailVerified,
      },
    });

    return created.id;
  });
}

