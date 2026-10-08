import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/users/infrastructure/UserSessionRepository", () => ({
  deleteUserSession: vi.fn(),
  findActiveUserSession: vi.fn(),
  registerUserSession: vi.fn(),
  renewUserSession: vi.fn(),
}));

import {
  registerUserSession,
  renewUserSession,
} from "@/modules/users/infrastructure/UserSessionRepository";
import {
  hashSessionCookie,
  registerApplicationSession,
  renewApplicationSession,
} from "@/platform/auth/ServerSessionActivityService";

beforeEach(() => vi.clearAllMocks());

describe("server inactivity policy", () => {
  it("registers sessions with a five-minute inactivity window", async () => {
    const absoluteExpiresAt = new Date("2026-10-13T10:00:00Z");
    await registerApplicationSession({
      sessionCookie: "cookie",
      userId: "user-id",
      firebaseSubject: "owner",
      absoluteExpiresAt,
    });

    expect(registerUserSession).toHaveBeenCalledWith({
      sessionHash: hashSessionCookie("cookie"),
      userId: "user-id",
      firebaseSubject: "owner",
      idleMilliseconds: 300_000,
      absoluteExpiresAt,
    });
  });

  it.each([0, 60_000, 300_000])(
    "deducts %i milliseconds of inactivity from renewal, including retries",
    async (idleForMilliseconds) => {
      await renewApplicationSession("cookie", "owner", idleForMilliseconds);

      expect(renewUserSession).toHaveBeenCalledWith(
        hashSessionCookie("cookie"),
        "owner",
        300_000 - idleForMilliseconds,
      );
    },
  );
});
