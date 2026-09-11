import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { getServerEnvironment } from "@/lib/env/server";

function resolveCredential() {
  const environment = getServerEnvironment();

  if (environment.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(environment.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  if (environment.FIREBASE_CLIENT_EMAIL && environment.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: environment.FIREBASE_PROJECT_ID,
      clientEmail: environment.FIREBASE_CLIENT_EMAIL,
      privateKey: environment.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  return applicationDefault();
}

export function getFirebaseAdminAuth() {
  const environment = getServerEnvironment();
  const app =
    getApps()[0] ??
    initializeApp({
      projectId: environment.FIREBASE_PROJECT_ID,
      credential: resolveCredential(),
    });

  return getAuth(app);
}
