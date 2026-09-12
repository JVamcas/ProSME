import "server-only";

import { getServerEnvironment } from "@/lib/env/server";

export function getFirebaseWebConfiguration() {
  const environment = getServerEnvironment();

  return {
    apiKey: environment.PUBLIC_FIREBASE_API_KEY,
    appId: environment.PUBLIC_FIREBASE_APP_ID,
    authDomain: environment.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: environment.PUBLIC_FIREBASE_PROJECT_ID,
  };
}
