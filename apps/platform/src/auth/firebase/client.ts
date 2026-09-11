"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, type Auth } from "firebase/auth";

import { getFirebaseClientEnvironment } from "./config";

let authPromise: Promise<Auth> | undefined;

export function getFirebaseClientAuth() {
  if (!authPromise) {
    const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseClientEnvironment());
    const auth = getAuth(app);
    authPromise = setPersistence(auth, inMemoryPersistence).then(() => auth);
  }
  return authPromise;
}
