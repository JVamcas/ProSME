import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/csrf/verify-token", () => ({ csrfTokensMatch: vi.fn() }));
vi.mock("@/auth/firebase/cookies", () => ({
  csrfCookieName: "csrf-token",
  readCookie: vi.fn(),
}));
vi.mock("@/modules/users/ServerRegistrationService", () => ({
  createAccount: vi.fn(),
}));

import { POST } from "@/app/api/auth/registration/route";
import { csrfTokensMatch } from "@/auth/csrf/verify-token";
import { readCookie } from "@/auth/firebase/cookies";
import { createAccount } from "@/modules/users/ServerRegistrationService";

const registration = {
  confirmPassword: "a-strong-password",
  email: "new@example.test",
  firstName: "New",
  password: "a-strong-password",
  surname: "User",
};

function registrationRequest(csrfToken = "token") {
  return new Request("https://example.test/api/auth/registration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "csrf-token=token",
    },
    body: JSON.stringify({ csrfToken, registration }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCookie).mockReturnValue("token");
  vi.mocked(csrfTokensMatch).mockReturnValue(true);
});

describe("registration route", () => {
  it("rejects a missing CSRF token before creating accounts", async () => {
    vi.mocked(csrfTokensMatch).mockReturnValue(false);

    const response = await POST(registrationRequest());

    expect(response.status).toBe(403);
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("creates an account from valid registration input", async () => {
    const response = await POST(registrationRequest());

    expect(response.status).toBe(200);
    expect(createAccount).toHaveBeenCalledWith(registration);
  });

  it("returns a generic error if provisioning fails", async () => {
    vi.mocked(createAccount).mockRejectedValue(
      new Error("database password details"),
    );

    const response = await POST(registrationRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "We could not create your account. Please try again.",
    });
  });
});
