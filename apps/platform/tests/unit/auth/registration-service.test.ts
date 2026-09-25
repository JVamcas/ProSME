import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/firebase/admin", () => ({
  getFirebaseAdminAuth: vi.fn(),
}));
vi.mock("@/db/repositories/UserRepository", () => ({
  provisionApplicant: vi.fn(),
}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { getFirebaseAdminAuth } from "@/auth/firebase/admin";
import { provisionApplicant } from "@/db/repositories/UserRepository";
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
  vi.clearAllMocks();
  vi.mocked(getFirebaseAdminAuth).mockReturnValue(auth as never);
  auth.createUser.mockResolvedValue({ uid: "new-user" });
});

describe("account registration", () => {
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
