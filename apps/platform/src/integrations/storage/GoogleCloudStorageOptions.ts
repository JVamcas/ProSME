import type { StorageOptions } from "@google-cloud/storage";
import { z } from "zod";

import {
  getServerEnvironment,
  type ServerEnvironment,
} from "@/lib/env/server";

const serviceAccountSchema = z.object({
  client_email: z.email(),
  private_key: z.string().min(1),
  project_id: z.string().min(1).optional(),
});

type StorageEnvironment = Pick<
  ServerEnvironment,
  | "FIREBASE_CLIENT_EMAIL"
  | "FIREBASE_PRIVATE_KEY"
  | "FIREBASE_SERVICE_ACCOUNT_JSON"
  | "GOOGLE_CLOUD_PROJECT"
  | "GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON"
>;

function parseServiceAccount(value: string, variableName: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${variableName} must contain valid JSON.`);
  }

  const result = serviceAccountSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `${variableName} must contain a service account client_email and private_key.`,
    );
  }

  return result.data;
}

export function resolveGoogleCloudStorageOptions(
  environment: StorageEnvironment,
): StorageOptions {
  const encodedServiceAccount =
    environment.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON ??
    environment.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (encodedServiceAccount) {
    const variableName = environment.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON
      ? "GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON"
      : "FIREBASE_SERVICE_ACCOUNT_JSON";
    const serviceAccount = parseServiceAccount(
      encodedServiceAccount,
      variableName,
    );

    return {
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
      },
      projectId:
        environment.GOOGLE_CLOUD_PROJECT ?? serviceAccount.project_id,
    };
  }

  if (environment.FIREBASE_CLIENT_EMAIL && environment.FIREBASE_PRIVATE_KEY) {
    return {
      credentials: {
        client_email: environment.FIREBASE_CLIENT_EMAIL,
        private_key: environment.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      projectId: environment.GOOGLE_CLOUD_PROJECT,
    };
  }

  return {
    projectId: environment.GOOGLE_CLOUD_PROJECT,
  };
}

export function getGoogleCloudStorageOptions(): StorageOptions {
  return resolveGoogleCloudStorageOptions(getServerEnvironment());
}
