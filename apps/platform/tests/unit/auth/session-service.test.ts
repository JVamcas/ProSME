import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/firebase/session", () => ({
  createFirebaseSession: vi.fn(),
}));
vi.mock("@/db/repositories/user.repository", () => ({
  provisionApplicant: vi.fn(),
}));

import { createFirebaseSession } from "@/auth/firebase/session";
import {
  establishApplicationSession,
  RecentAuthenticationRequiredError,
} from "@/auth/firebase/session.service";
import { provisionApplicant } from "@/db/repositories/user.repository";

const currentTime = Date.UTC(2026, 8, 12, 12, 0, 0);
const user = {
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  email: "user@example.test",
  displayName: "Test User",
  userType: "applicant" as const,
  status: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: "firebase-subject",
  capabilities: new Set<string>(),
  roleCodes: new Set(["applicant"]),
};

function firebaseSession(authenticatedAt: number) {
  return {
    decodedToken: {
      auth_time: Math.floor(authenticatedAt / 1000),
      email: user.email,
      email_verified: true,
      name: user.displayName,
      uid: "firebase-subject",
    },
    maxAge: 3_600_000,
    sessionCookie: "firebase-session-cookie",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(currentTime);
});

describe("application session service", () => {
  it("provisions the verified Firebase identity", async () => {
    vi.mocked(createFirebaseSession).mockResolvedValue(
      firebaseSession(currentTime) as never,
    );
    vi.mocked(provisionApplicant).mockResolvedValue(user);

    const result = await establishApplicationSession("firebase-id-token");

    expect(provisionApplicant).toHaveBeenCalledWith({
      subject: "firebase-subject",
      email: user.email,
      displayName: user.displayName,
      emailVerified: true,
    });
    expect(result.user).toEqual(user);
    expect(result.sessionCookie).toBe("firebase-session-cookie");
  });

  it("rejects an identity without recent authentication", async () => {
    const oldAuthentication = currentTime - 6 * 60 * 1000;
    vi.mocked(createFirebaseSession).mockResolvedValue(
      firebaseSession(oldAuthentication) as never,
    );

    await expect(
      establishApplicationSession("firebase-id-token"),
    ).rejects.toBeInstanceOf(RecentAuthenticationRequiredError);
    expect(provisionApplicant).not.toHaveBeenCalled();
  });
});
