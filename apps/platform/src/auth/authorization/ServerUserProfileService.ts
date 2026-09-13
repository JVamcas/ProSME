import "server-only";

import { resolveUserFromHeaders } from "./current-user";

export async function getAuthenticatedUserProfile(requestHeaders: Headers) {
  const user = await resolveUserFromHeaders(requestHeaders);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    userType: user.userType,
    status: user.status,
    roles: [...user.roleCodes].sort(),
    capabilities: [...user.capabilities].sort(),
  };
}
