import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resetServerEnvironmentForTests } from "@/lib/env/server";
import {
  createApplicationPreflightToken,
  readApplicationPreflightToken,
} from "@/modules/applications/domain/ApplicationPreflightToken";
import {
  ApplicationReferenceConfigurationError,
  formatApplicationReference,
} from "@/modules/applications/domain/ApplicationReference";

const issuedAt = new Date("2026-09-23T10:00:00.000Z");

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  process.env.PAYLOAD_SECRET = "a-secure-test-secret-with-at-least-32-characters";
  process.env.FIREBASE_PROJECT_ID = "test-project";
  process.env.PUBLIC_FIREBASE_API_KEY = "test-api-key";
  process.env.PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
  process.env.PUBLIC_FIREBASE_PROJECT_ID = "test-project";
  process.env.PUBLIC_FIREBASE_APP_ID = "test-app-id";
  resetServerEnvironmentForTests();
});

describe("submission preflight token", () => {
  function token() {
    return createApplicationPreflightToken({
      applicationId: "10000000-0000-4000-8000-000000000001",
      applicationRowVersion: 4,
      businessUpdatedAt: "2026-09-23T09:00:00.000Z",
      configurationFingerprint: "a".repeat(64),
      documentFingerprint: "b".repeat(64),
      ownerUserId: "20000000-0000-4000-8000-000000000001",
      responseRowVersion: 3,
    }, issuedAt);
  }

  it("round-trips only during the five-minute readiness window", () => {
    expect(readApplicationPreflightToken(
      token(),
      new Date("2026-09-23T10:04:59.999Z"),
    )).toMatchObject({
      applicationRowVersion: 4,
      responseRowVersion: 3,
    });
    expect(readApplicationPreflightToken(
      token(),
      new Date("2026-09-23T10:05:00.000Z"),
    )).toBeNull();
  });

  it("rejects a modified readiness token", () => {
    const candidate = token();
    const replacement = candidate[0] === "a" ? "b" : "a";
    expect(readApplicationPreflightToken(
      `${replacement}${candidate.slice(1)}`,
      issuedAt,
    )).toBeNull();
  });
});

describe("application reference formatter", () => {
  it("uses Funding Call scope, UTC year and an atomic sequence value", () => {
    expect(formatApplicationReference({
      fundingCallReference: "SME-2027-01",
      sequenceValue: BigInt(1),
      submittedAt: new Date("2026-12-31T23:59:59.000Z"),
    })).toBe("SME-2027-01-2026-000001");
    expect(formatApplicationReference({
      fundingCallReference: "YOUTH_FUND",
      sequenceValue: BigInt(1000000),
      submittedAt: new Date("2027-01-01T00:00:00.000Z"),
    })).toBe("YOUTH_FUND-2027-1000000");
  });

  it("blocks invalid configuration and sequence boundaries", () => {
    expect(() => formatApplicationReference({
      fundingCallReference: "contains spaces",
      sequenceValue: BigInt(1),
      submittedAt: issuedAt,
    })).toThrow(ApplicationReferenceConfigurationError);
    expect(() => formatApplicationReference({
      fundingCallReference: "SME",
      sequenceValue: BigInt(0),
      submittedAt: issuedAt,
    })).toThrow(ApplicationReferenceConfigurationError);
  });
});
