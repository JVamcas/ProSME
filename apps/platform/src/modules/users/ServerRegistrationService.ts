import "server-only";

import { getFirebaseAdminAuth } from "@/auth/firebase/admin";
import type { RegistrationValues } from "@/auth/firebase/auth-form.schemas";
import { provisionApplicant } from "@/db/repositories/UserRepository";
import { logger } from "@/integrations/monitoring/logger";

export async function createAccount(input: RegistrationValues) {
  const auth = getFirebaseAdminAuth();
  const email = input.email.trim().toLowerCase();
  const displayName = `${input.firstName.trim()} ${input.surname.trim()}`;
  const firebaseUser = await auth.createUser({
    email,
    password: input.password,
    displayName,
  });

  try {
    await provisionApplicant({
      subject: firebaseUser.uid,
      email,
      displayName,
      emailVerified: false,
    });
  } catch (error) {
    logger.error("registration.provision_failed", {
      firebaseUid: firebaseUser.uid,
      errorCode: error instanceof Error ? error.name : "unknown",
    });

    try {
      await auth.deleteUser(firebaseUser.uid);
      logger.info("registration.firebase_rolled_back", {
        firebaseUid: firebaseUser.uid,
      });
    } catch (rollbackError) {
      logger.error("registration.firebase_rollback_failed", {
        firebaseUid: firebaseUser.uid,
        errorCode: rollbackError instanceof Error
          ? rollbackError.name
          : "unknown",
      });
    }

    throw error;
  }
}
