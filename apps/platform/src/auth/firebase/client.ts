"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, type Auth } from "firebase/auth";

import { getFirebaseClientEnvironment } from "./firebase-config-client.service";

let authPromise: Promise<Auth> | undefined;

export function getFirebaseClientAuth() {
  if (!authPromise) {
    authPromise = getFirebaseClientEnvironment().then(async (environment) => {
      const app = getApps().length > 0
        ? getApp()
        : initializeApp(environment);
      const auth = getAuth(app);

      await setPersistence(auth, inMemoryPersistence);
      return auth;
    });
  }

  return authPromise;
}
