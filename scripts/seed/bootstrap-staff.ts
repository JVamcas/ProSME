import { eq } from "drizzle-orm";
import { getPayload } from "payload";

import { getFirebaseAdminAuth } from "../../apps/platform/src/auth/firebase/admin";
import { getDatabase } from "../../apps/platform/src/db/client";
import { roles, userIdentities, userRoles, users } from "../../apps/platform/src/db/schema";
import config from "../../apps/platform/src/payload.config";

const email = process.env.BOOTSTRAP_STAFF_EMAIL?.trim().toLowerCase();
const roleCode = process.env.BOOTSTRAP_STAFF_ROLE?.trim() || "system_administrator";

if (!email) throw new Error("BOOTSTRAP_STAFF_EMAIL is required");
if (roleCode === "applicant") throw new Error("The staff bootstrap cannot assign the applicant role");

const firebaseUser = await getFirebaseAdminAuth().getUserByEmail(email);
if (!firebaseUser.email || !firebaseUser.emailVerified) {
  throw new Error("The Firebase account must have a verified email address");
}

const database = getDatabase();
const [role] = await database.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
if (!role) throw new Error(`Unknown role: ${roleCode}. Apply the application migration first.`);

const applicationUserId = await database.transaction(async (transaction) => {
  const [existingIdentity] = await transaction
    .select({ userId: userIdentities.userId })
    .from(userIdentities)
    .where(eq(userIdentities.subject, firebaseUser.uid))
    .limit(1);

  let userId = existingIdentity?.userId;
  if (!userId) {
    const [createdUser] = await transaction
      .insert(users)
      .values({
        email,
        displayName: firebaseUser.displayName || email,
        userType: "staff",
        status: "active",
      })
      .returning({ id: users.id });
    userId = createdUser.id;
    await transaction.insert(userIdentities).values({
      userId,
      provider: "firebase",
      subject: firebaseUser.uid,
      emailVerified: true,
    });
  } else {
    await transaction
      .update(users)
      .set({ userType: "staff", status: "active", updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  await transaction.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing();
  return userId;
});

const payload = await getPayload({ config });
const existingPrincipals = await payload.find({
  collection: "cms-principals",
  depth: 0,
  limit: 1,
  overrideAccess: true,
  where: { applicationUserId: { equals: applicationUserId } },
});

if (existingPrincipals.docs[0]) {
  await payload.update({
    collection: "cms-principals",
    id: existingPrincipals.docs[0].id,
    overrideAccess: true,
    data: {
      email,
      displayName: firebaseUser.displayName || email,
      status: "active",
    },
  });
} else {
  await payload.create({
    collection: "cms-principals",
    overrideAccess: true,
    data: {
      applicationUserId,
      email,
      displayName: firebaseUser.displayName || email,
      status: "active",
    },
  });
}

payload.logger.info(`Bootstrapped ${email} as ${roleCode}`);
process.exit(0);
