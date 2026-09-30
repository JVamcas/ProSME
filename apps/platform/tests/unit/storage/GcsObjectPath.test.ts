import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  gcsObjectPathSegments,
  resolveGcsObjectPath,
} from "@/integrations/storage/GcsObjectPath";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GCS object path", () => {
  it.each(["local", "dev", "prod"] as const)(
    "uses the %s deployment environment as the root",
    (environment) => {
      vi.stubEnv("ENVIRONMENT", environment);

      expect(resolveGcsObjectPath(
        ...gcsObjectPathSegments.users,
        "user-id",
        "document.pdf",
      ))
        .toBe(`${environment}/users/user-id/document.pdf`);
    },
  );

  it("defaults to the local root when the environment is not provided", () => {
    vi.stubEnv("ENVIRONMENT", undefined);

    expect(resolveGcsObjectPath("cms")).toBe("local/cms");
  });

  it("rejects unsupported deployment environments", () => {
    vi.stubEnv("ENVIRONMENT", "staging");

    expect(() => resolveGcsObjectPath("cms")).toThrow();
  });

  it("keeps CMS and utility-owned objects in their agreed namespaces", () => {
    vi.stubEnv("ENVIRONMENT", "dev");

    expect(resolveGcsObjectPath(...gcsObjectPathSegments.cms))
      .toBe("dev/cms");
    expect(resolveGcsObjectPath(
      ...gcsObjectPathSegments.utilities.fundingCalls,
      "funding-call-id",
      "criteria.pdf",
    )).toBe(
      "dev/utilities/funding-calls/funding-call-id/criteria.pdf",
    );
    expect(resolveGcsObjectPath(
      ...gcsObjectPathSegments.utilities.emailTemplates,
      "application-submitted.html",
    )).toBe(
      "dev/utilities/templates/email/application-submitted.html",
    );
  });
});
