import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/auth/firebase/ServerFirebaseSession", () => ({
  createFirebaseSession: vi.fn(),
  verifyFirebaseSessionCookie: vi.fn(),
}));
vi.mock("@/platform/auth/ServerSessionActivityService", () => ({
  registerApplicationSession: vi.fn(),
  findActiveApplicationSession: vi.fn(),
  renewApplicationSession: vi.fn(),
}));
vi.mock("@/db/repositories/UserRepository", () => ({
  provisionApplicant: vi.fn(),
}));

import {
  createFirebaseSession,
  verifyFirebaseSessionCookie,
} from "@/platform/auth/firebase/ServerFirebaseSession";
import {
  establishApplicationSession,
  RecentAuthenticationRequiredError,
  readSessionActivity,
  renewSessionActivity,
} from "@/platform/auth/ServerSessionService";
import { provisionApplicant } from "@/db/repositories/UserRepository";
import { getSessionCookieName } from "@/auth/firebase/cookies";
import {
  findActiveApplicationSession,
  registerApplicationSession,
  renewApplicationSession,
} from "@/platform/auth/ServerSessionActivityService";

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
  vi.mocked(registerApplicationSession).mockResolvedValue({
    expiresAt: new Date(currentTime + 30 * 60 * 1000),
  });
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
    expect(result.maxAge).toBe(30 * 60 * 1000);
    expect(registerApplicationSession).toHaveBeenCalledWith({
      sessionCookie: "firebase-session-cookie",
      userId: user.id,
      firebaseSubject: "firebase-subject",
      absoluteExpiresAt: new Date(currentTime + 3_600_000),
    });
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

  it("does not issue a session for an inactive account", async () => {
    vi.mocked(createFirebaseSession).mockResolvedValue(firebaseSession(currentTime) as never);
    vi.mocked(provisionApplicant).mockResolvedValue({ ...user, status: "suspended" });
    await expect(establishApplicationSession("token")).rejects.toThrow("active account");
    expect(registerApplicationSession).not.toHaveBeenCalled();
  });

  it("reads status without extending the inactivity deadline", async () => {
    vi.mocked(verifyFirebaseSessionCookie).mockResolvedValue({ uid: "firebase-subject" } as never);
    vi.mocked(findActiveApplicationSession).mockResolvedValue({
      expiresAt: new Date(currentTime + 60_000),
    });
    const headers = new Headers({ cookie: `${getSessionCookieName()}=cookie` });
    await expect(readSessionActivity(headers)).resolves.toEqual({
      expiresAt: currentTime + 60_000,
      sessionCookie: "cookie",
    });
    expect(verifyFirebaseSessionCookie).toHaveBeenCalledWith("cookie", { checkRevoked: true });
    expect(renewApplicationSession).not.toHaveBeenCalled();
  });

  it("requires verified identity and atomically renews only an active own session", async () => {
    vi.mocked(verifyFirebaseSessionCookie).mockResolvedValue({ uid: "firebase-subject" } as never);
    vi.mocked(renewApplicationSession).mockResolvedValue(null);
    const headers = new Headers({ cookie: `${getSessionCookieName()}=cookie` });
    await expect(renewSessionActivity(headers, 15_000)).resolves.toBeNull();
    expect(renewApplicationSession).toHaveBeenCalledWith("cookie", "firebase-subject", 15_000);
    vi.mocked(verifyFirebaseSessionCookie).mockRejectedValueOnce(new Error("revoked"));
    vi.mocked(renewApplicationSession).mockClear();
    await expect(renewSessionActivity(headers, 0)).resolves.toBeNull();
    expect(renewApplicationSession).not.toHaveBeenCalled();
  });
});
