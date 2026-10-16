import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/content/application/ServerPublicPageVisibilityService", () => ({
  getPublicPageVisibility: vi.fn(),
}));
import { getPublicPageVisibility } from "@/modules/content/application/ServerPublicPageVisibilityService";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/firebase/admin", () => ({
  getFirebaseAdminAuth: vi.fn(),
}));
vi.mock("@/modules/users/infrastructure/UserRepository", () => ({
  provisionApplicant: vi.fn(),
}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { getFirebaseAdminAuth } from "@/auth/firebase/admin";
import { provisionApplicant } from "@/modules/users/infrastructure/UserRepository";
import { createAccount } from "@/modules/users/ServerRegistrationService";

const auth = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
};
const registration = {
  confirmPassword: "a-strong-password",
  email: " New@Example.test ",
  firstName: "New",
  password: "a-strong-password",
  surname: "User",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPublicPageVisibility).mockResolvedValue({});
  vi.mocked(getFirebaseAdminAuth).mockReturnValue(auth as never);
  auth.createUser.mockResolvedValue({ uid: "new-user" });
});

describe("account registration", () => {
  it("rejects hidden account creation before any side effects", async () => {
    vi.mocked(getPublicPageVisibility).mockResolvedValue({ "account-creation": false });
    await expect(createAccount(registration)).rejects.toThrow("Account creation is currently unavailable.");
    expect(getFirebaseAdminAuth).not.toHaveBeenCalled();
    expect(provisionApplicant).not.toHaveBeenCalled();
  });

  it("does not create accounts if visibility cannot be read", async () => {
    vi.mocked(getPublicPageVisibility).mockRejectedValue(new Error("unavailable"));
    await expect(createAccount(registration)).rejects.toThrow("unavailable");
    expect(getFirebaseAdminAuth).not.toHaveBeenCalled();
    expect(provisionApplicant).not.toHaveBeenCalled();
  });

  it("creates Firebase and PostgreSQL accounts", async () => {
    await createAccount(registration);

    expect(auth.createUser).toHaveBeenCalledWith({
      email: "new@example.test",
      password: registration.password,
      displayName: "New User",
    });
    expect(provisionApplicant).toHaveBeenCalledWith({
      subject: "new-user",
      email: "new@example.test",
      displayName: "New User",
      emailVerified: false,
    });
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes Firebase if PostgreSQL provisioning fails", async () => {
    const error = new Error("database unavailable");
    vi.mocked(provisionApplicant).mockRejectedValue(error);

    await expect(createAccount(registration)).rejects.toBe(error);
    expect(auth.deleteUser).toHaveBeenCalledWith("new-user");
  });

  it("does not provision when Firebase creation fails", async () => {
    auth.createUser.mockRejectedValue(new Error("email exists"));

    await expect(createAccount(registration)).rejects.toThrow("email exists");
    expect(provisionApplicant).not.toHaveBeenCalled();
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });
});
