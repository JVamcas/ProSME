import { describe, expect, it } from "vitest";

import { resolveGoogleCloudStorageOptions } from "@/integrations/storage/GoogleCloudStorageOptions";

const baseEnvironment = {
  FIREBASE_CLIENT_EMAIL: undefined,
  FIREBASE_PRIVATE_KEY: undefined,
  FIREBASE_SERVICE_ACCOUNT_JSON: undefined,
  GOOGLE_CLOUD_PROJECT: undefined,
  GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON: undefined,
};

describe("resolveGoogleCloudStorageOptions", () => {
  it("uses a dedicated Google Cloud service account", () => {
    const options = resolveGoogleCloudStorageOptions({
      ...baseEnvironment,
      GOOGLE_CLOUD_PROJECT: "storage-project",
      GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: "storage@example.iam.gserviceaccount.com",
        private_key: "first\\nsecond",
        project_id: "credential-project",
      }),
    });

    expect(options).toEqual({
      credentials: {
        client_email: "storage@example.iam.gserviceaccount.com",
        private_key: "first\nsecond",
      },
      projectId: "storage-project",
    });
  });

  it("uses the configured Firebase service account when dedicated credentials are absent", () => {
    const options = resolveGoogleCloudStorageOptions({
      ...baseEnvironment,
      FIREBASE_CLIENT_EMAIL: "firebase@example.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "first\\nsecond",
      GOOGLE_CLOUD_PROJECT: "storage-project",
    });

    expect(options).toEqual({
      credentials: {
        client_email: "firebase@example.iam.gserviceaccount.com",
        private_key: "first\nsecond",
      },
      projectId: "storage-project",
    });
  });

  it("leaves authentication to ADC when no service account is configured", () => {
    expect(
      resolveGoogleCloudStorageOptions({
        ...baseEnvironment,
        GOOGLE_CLOUD_PROJECT: "storage-project",
      }),
    ).toEqual({ projectId: "storage-project" });
  });
});
