"use client";

import { z } from "zod";

import { requestJson } from "@/lib/client-http";

const firebaseClientEnvironmentSchema = z.object({
  apiKey: z.string().min(1),
  appId: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
});

type FirebaseClientEnvironment = z.infer<
  typeof firebaseClientEnvironmentSchema
>;

let environmentPromise: Promise<FirebaseClientEnvironment> | undefined;

export function getFirebaseClientEnvironment() {
  if (!environmentPromise) {
    environmentPromise = requestJson<FirebaseClientEnvironment>(
      "/api/config/firebase",
      { cache: "no-store" },
    ).then((environment) =>
      firebaseClientEnvironmentSchema.parse(environment),
    );
  }

  return environmentPromise;
}
