import "server-only";

import { getFirebaseAdminAuth } from "@/auth/firebase/admin";

export type FirebaseDirectoryAccount = {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  disabled: boolean;
  lastLoginAt: string | null;
};

export async function listFirebaseDirectoryAccounts(): Promise<FirebaseDirectoryAccount[]> {
  const accounts: FirebaseDirectoryAccount[] = [];
  let nextPageToken: string | undefined;
  do {
    const result = await getFirebaseAdminAuth().listUsers(1000, nextPageToken);
    accounts.push(
      ...result.users.map((user) => ({
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName || user.email || user.uid,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        lastLoginAt: user.metadata.lastSignInTime ?? null,
      })),
    );
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  return accounts;
}
