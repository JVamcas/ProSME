import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/auth/firebase/ServerAuthEmailService", () => ({
  requestVerificationEmail: vi.fn(),
  requestPasswordResetEmail: vi.fn(),
  AuthEmailRequestError: class extends Error {},
}));
import { POST as verification } from "@/app/api/auth/verification-email/route";
import { POST as reset } from "@/app/api/auth/password-reset/route";
import {
  requestPasswordResetEmail,
  requestVerificationEmail,
} from "@/platform/auth/firebase/ServerAuthEmailService";
import { csrfCookieName } from "@/auth/firebase/cookies";

const token = "a".repeat(64);
function request(body: unknown, cookie = token) {
  return new Request("https://fund.example/api/auth/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${csrfCookieName}=${cookie}`,
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => vi.clearAllMocks());

describe("authentication email routes", () => {
  it.each([verification, reset])(
    "rejects invalid input before invoking a service",
    async (route) => {
      expect((await route(request({}))).status).toBe(400);
      expect(requestVerificationEmail).not.toHaveBeenCalled();
      expect(requestPasswordResetEmail).not.toHaveBeenCalled();
    },
  );
  it("rejects CSRF mismatch for both operations", async () => {
    expect(
      (
        await verification(
          request({ csrfToken: token, idToken: "identity" }, "wrong"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await reset(
          request({ csrfToken: token, email: "owner@example.com" }, "wrong"),
        )
      ).status,
    ).toBe(403);
    expect(requestVerificationEmail).not.toHaveBeenCalled();
    expect(requestPasswordResetEmail).not.toHaveBeenCalled();
  });
  it("refuses a caller-selected verification recipient", async () => {
    const response = await verification(
      request({
        csrfToken: token,
        idToken: "identity",
        email: "other@example.com",
      }),
    );
    expect(response.status).toBe(400);
    expect(requestVerificationEmail).not.toHaveBeenCalled();
  });
  it("delegates verification to the self-service identity check", async () => {
    expect(
      (await verification(request({ csrfToken: token, idToken: "identity" })))
        .status,
    ).toBe(200);
    expect(requestVerificationEmail).toHaveBeenCalledWith("identity");
  });
  it("returns a generic success for password recovery", async () => {
    const response = await reset(
      request({ csrfToken: token, email: "owner@example.com" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
  it("does not expose provider failures or action codes", async () => {
    vi.mocked(requestPasswordResetEmail).mockRejectedValueOnce(
      new Error("sensitive-provider-data"),
    );
    const response = await reset(
      request({ csrfToken: token, email: "owner@example.com" }),
    );
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "sensitive-provider-data",
    );
  });
});
