import type { AuthStrategy } from "payload";

import { capabilities } from "@/auth/authorization/capabilities";
import { can } from "@/auth/authorization/policy";

export const firebaseSessionStrategy: AuthStrategy = {
  name: "firebase-session",
  authenticate: async ({ headers, payload }) => {
    const [{ verifyFirebaseSessionFromHeaders }, { findUserByFirebaseSubject }] = await Promise.all([
      import("@/auth/firebase/session"),
      import("@/db/repositories/user.repository"),
    ]);
    const identity = await verifyFirebaseSessionFromHeaders(headers);
    if (!identity) return { user: null };

    const applicationUser = await findUserByFirebaseSubject(identity.uid);
    if (!can(applicationUser, capabilities.cmsAccess)) return { user: null };

    const principals = await payload.find({
      collection: "cms-principals",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { applicationUserId: { equals: applicationUser!.id } },
    });
    const principal = principals.docs[0];
    if (!principal || principal.status !== "active") return { user: null };

    return {
      user: {
        ...principal,
        collection: "cms-principals",
        capabilities: [...applicationUser!.capabilities],
      },
    };
  },
};
