import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
  createSessionCookie: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/auth/firebase/admin", () => ({ getFirebaseAdminAuth: () => auth }));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ SESSION_COOKIE_DAYS: 5 }),
}));

import {
  createFirebaseSession,
  verifyFirebaseSessionCookie,
  verifyFirebaseSessionFromHeaders,
} from "@/platform/auth/firebase/ServerFirebaseSession";
import { getSessionCookieName } from "@/auth/firebase/cookies";

const identity = {
  uid: "synthetic",
  email: "test@example.test",
  email_verified: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  auth.verifyIdToken.mockResolvedValue(identity);
  auth.verifySessionCookie.mockResolvedValue(identity);
  auth.createSessionCookie.mockResolvedValue("session");
});

describe("Firebase verification policy", () => {
  it("uses standard token verification for normal session creation", async () => {
    const session = await createFirebaseSession("id-token");
    expect(auth.verifyIdToken).toHaveBeenCalledExactlyOnceWith("id-token");
    expect(auth.createSessionCookie).toHaveBeenCalledWith("id-token", {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });
    expect(session).toMatchObject({
      decodedToken: identity,
      sessionCookie: "session",
    });
  });

  it("keeps verified email enforcement and rejects invalid session-creation tokens", async () => {
    auth.verifyIdToken.mockResolvedValueOnce({
      ...identity,
      email_verified: false,
    });
    await expect(createFirebaseSession("unverified")).rejects.toThrow(
      "verified email",
    );
    auth.verifyIdToken.mockRejectedValueOnce(new Error("expired token"));
    await expect(createFirebaseSession("expired")).rejects.toThrow(
      "expired token",
    );
  });

  it("uses standard cookie verification for normal protected requests", async () => {
    const headers = new Headers({
      cookie: `${getSessionCookieName()}=session`,
    });
    await expect(verifyFirebaseSessionFromHeaders(headers)).resolves.toEqual(
      identity,
    );
    expect(auth.verifySessionCookie).toHaveBeenCalledExactlyOnceWith("session");
  });

  it("supports explicitly required immediate revocation checks", async () => {
    await createFirebaseSession("sensitive-id-token", { checkRevoked: true });
    await verifyFirebaseSessionCookie("sensitive-session", {
      checkRevoked: true,
    });
    expect(auth.verifyIdToken).toHaveBeenCalledWith("sensitive-id-token", true);
    expect(auth.verifySessionCookie).toHaveBeenCalledWith(
      "sensitive-session",
      true,
    );
  });

  it.each(
    [false, true].flatMap((checkRevoked) =>
      [
        "invalid signature",
        "expired session",
        "wrong issuer",
        "revoked session",
      ].map((message) => [checkRevoked, message] as const),
    ),
  )(
    "denies failed SDK verification with checkRevoked=%s: %s",
    async (checkRevoked, message) => {
      auth.verifySessionCookie.mockRejectedValueOnce(new Error(message));
      const headers = new Headers({
        cookie: `${getSessionCookieName()}=bad-session`,
      });
      await expect(
        verifyFirebaseSessionFromHeaders(headers, { checkRevoked }),
      ).resolves.toBeNull();
    },
  );

  it("returns no identity for a missing cookie without invoking Firebase", async () => {
    await expect(
      verifyFirebaseSessionFromHeaders(new Headers()),
    ).resolves.toBeNull();
    expect(auth.verifySessionCookie).not.toHaveBeenCalled();
  });
});
