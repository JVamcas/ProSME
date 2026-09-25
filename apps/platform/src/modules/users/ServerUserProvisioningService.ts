import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { getFirebaseAdminAuth } from "@/auth/firebase/admin";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import { findAccessUser } from "./infrastructure/UserAccessRepository";
import { provisionDirectoryApplicant } from "./infrastructure/UserProvisioningRepository";

export async function provisionUnprovisionedUser(
  actor: AuthenticatedUser | null,
  directoryId: string,
) {
  const authorized = requirePermission(actor, permissionCodes.userManage);

  if (!directoryId.startsWith("firebase:") || directoryId.length <= 9) {
    throw new ResourceNotFoundError("Firebase user");
  }

  const uid = directoryId.slice(9);
  if (uid.length > 128 || uid.includes("/")) {
    throw new ResourceNotFoundError("Firebase user");
  }

  const firebaseUser = await getFirebaseAdminAuth().getUser(uid).catch((error) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "auth/user-not-found"
    ) {
      throw new ResourceNotFoundError("Firebase user");
    }
    throw error;
  });

  if (!firebaseUser.email) {
    throw new ResourceConflictError("The Firebase user has no email address.");
  }

  const userId = await provisionDirectoryApplicant(authorized.id, {
    uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email,
    emailVerified: firebaseUser.emailVerified,
  });

  return findAccessUser(userId);
}
