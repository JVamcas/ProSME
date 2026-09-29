import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  generateEmailVerificationLink: vi.fn(),
  generatePasswordResetLink: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/auth/firebase/admin", () => ({ getFirebaseAdminAuth: () => auth }));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ APP_PUBLIC_URL: "https://fund.example" }),
}));
vi.mock("@/modules/users/infrastructure/AuthEmailRateLimitRepository", () => ({
  consumeAuthEmailRateLimit: vi.fn(),
}));
vi.mock(
  "@/modules/notifications/application/ServerAuthenticationNotificationService",
  () => ({ queueAuthenticationEmail: vi.fn() }),
);

import { consumeAuthEmailRateLimit } from "@/modules/users/infrastructure/AuthEmailRateLimitRepository";
import { queueAuthenticationEmail } from "@/modules/notifications/application/ServerAuthenticationNotificationService";
import {
  generateAuthenticationActionUrl,
  requestPasswordResetEmail,
  requestVerificationEmail,
} from "@/platform/auth/firebase/ServerAuthEmailService";

const account = {
  uid: "firebase-owner",
  email: "owner@example.com",
  displayName: "Owner",
  disabled: false,
  emailVerified: false,
  providerData: [{ providerId: "password" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.verifyIdToken.mockResolvedValue({ uid: account.uid });
  auth.getUser.mockResolvedValue(account);
  auth.getUserByEmail.mockResolvedValue(account);
  vi.mocked(consumeAuthEmailRateLimit).mockResolvedValue(true);
  auth.generateEmailVerificationLink.mockResolvedValue(
    "https://project.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=secure-code&continueUrl=https://evil.example",
  );
  auth.generatePasswordResetLink.mockResolvedValue(
    "https://project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=secure-code",
  );
});

describe("authentication email requests", () => {
  it("derives verification recipient from the verified identity, including unverified accounts", async () => {
    await requestVerificationEmail("identity-token");
    expect(auth.verifyIdToken).toHaveBeenCalledWith("identity-token", true);
    expect(queueAuthenticationEmail).toHaveBeenCalledWith(
      "auth.email.verification",
      {
        firebaseUid: account.uid,
        recipientEmail: account.email,
        recipientName: account.displayName,
      },
    );
  });

  it("rejects invalid identity before lookup or delivery", async () => {
    auth.verifyIdToken.mockRejectedValue(new Error("invalid token"));
    await expect(requestVerificationEmail("bad-token")).rejects.toMatchObject({
      status: 401,
    });
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(queueAuthenticationEmail).not.toHaveBeenCalled();
  });

  it("does not resend to verified or disabled accounts", async () => {
    auth.getUser.mockResolvedValueOnce({ ...account, emailVerified: true });
    await requestVerificationEmail("identity-token");
    expect(queueAuthenticationEmail).not.toHaveBeenCalled();
    auth.getUser.mockResolvedValueOnce({ ...account, disabled: true });
    await expect(
      requestVerificationEmail("identity-token"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rate limits verification without storing identity in rate keys", async () => {
    vi.mocked(consumeAuthEmailRateLimit).mockResolvedValue(false);
    await expect(
      requestVerificationEmail("identity-token"),
    ).rejects.toMatchObject({ status: 429 });
    expect(consumeAuthEmailRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      1,
    );
    expect(queueAuthenticationEmail).not.toHaveBeenCalled();
  });

  it("returns the same successful result for unknown, disabled and valid reset accounts", async () => {
    auth.getUserByEmail.mockRejectedValueOnce({ code: "auth/user-not-found" });
    await expect(
      requestPasswordResetEmail("unknown@example.com"),
    ).resolves.toBeUndefined();
    auth.getUserByEmail.mockResolvedValueOnce({ ...account, disabled: true });
    await expect(
      requestPasswordResetEmail(account.email),
    ).resolves.toBeUndefined();
    expect(queueAuthenticationEmail).not.toHaveBeenCalled();
    await expect(
      requestPasswordResetEmail(" OWNER@example.com "),
    ).resolves.toBeUndefined();
    expect(queueAuthenticationEmail).toHaveBeenCalledOnce();
    expect(auth.getUserByEmail).toHaveBeenLastCalledWith(account.email);
  });

  it("suppresses duplicate reset requests and does not hide provider failures", async () => {
    vi.mocked(consumeAuthEmailRateLimit)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await expect(
      requestPasswordResetEmail(account.email),
    ).resolves.toBeUndefined();
    expect(auth.getUserByEmail).not.toHaveBeenCalled();
    auth.getUserByEmail.mockRejectedValueOnce({ code: "auth/internal-error" });
    await expect(
      requestPasswordResetEmail(account.email),
    ).rejects.toMatchObject({ code: "auth/internal-error" });
  });
});

describe("application action links", () => {
  it.each([
    ["auth.email.verification", "verifyEmail"],
    ["auth.password.reset", "resetPassword"],
  ] as const)(
    "links %s directly to the application",
    async (eventKey, mode) => {
      const result = new URL(
        await generateAuthenticationActionUrl({
          eventKey,
          firebaseUid: account.uid,
          recipientEmail: account.email,
        }),
      );
      expect(result.origin).toBe("https://fund.example");
      expect(result.pathname).toBe("/auth/action");
      expect(result.searchParams.get("mode")).toBe(mode);
      expect(result.searchParams.get("oobCode")).toBe("secure-code");
      expect(result.searchParams.has("continueUrl")).toBe(false);
    },
  );

  it("rejects an email changed after queueing rather than sending another account's link", async () => {
    auth.getUser.mockResolvedValue({
      ...account,
      email: "changed@example.com",
    });
    await expect(
      generateAuthenticationActionUrl({
        eventKey: "auth.password.reset",
        firebaseUid: account.uid,
        recipientEmail: account.email,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(auth.generatePasswordResetLink).not.toHaveBeenCalled();
  });
});
