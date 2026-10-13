import type { AuthStrategy } from "payload";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { ensureCmsPrincipal } from "@/payload/system/ensure-cms-principal";

export const firebaseSessionStrategy: AuthStrategy = {
  name: "firebase-session",
  authenticate: async ({ headers, payload }) => {
    const applicationUser = await resolveUserFromHeaders(headers);
    if (!applicationUser || !can(applicationUser, permissionCodes.cmsAccess)) {
      return { user: null };
    }

    const principal = await ensureCmsPrincipal(payload, applicationUser);

    return {
      user: {
        ...principal,
        collection: "cms-principals",
        capabilities: [...applicationUser.capabilities],
      },
    };
  },
};
