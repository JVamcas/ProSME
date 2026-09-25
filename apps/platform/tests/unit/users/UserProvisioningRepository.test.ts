import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries, userIdentities, users } from "@/db/schema";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import { provisionDirectoryApplicant } from "@/modules/users/infrastructure/UserProvisioningRepository";

const identity = {
  uid: "firebase-user",
  email: " Person@Example.test ",
  displayName: "Person Name",
  emailVerified: false,
};

function fakeDatabase(options: {
  userCreated?: boolean;
  identityLinked?: boolean;
  roleAssigned?: boolean;
} = {}) {
  const written: Array<{ table: unknown; values: unknown }> = [];
  const transaction = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        written.push({ table, values });
        return {
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(async () => {
              if (table === users) {
                return options.userCreated === false ? [] : [{ id: "app-user" }];
              }
              if (table === userIdentities) {
                return options.identityLinked === false ? [] : [{ id: "identity" }];
              }
              return [];
            }),
          })),
        };
      }),
    })),
    execute: vi.fn(async () => ({
      rows: options.roleAssigned === false ? [] : [{ user_id: "app-user" }],
    })),
  };
  vi.mocked(getDatabase).mockReturnValue({
    transaction: (callback: (tx: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as never);
  return { transaction, written };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("manual user provisioning repository", () => {
  it("writes the user, Firebase identity, applicant role, and audit together", async () => {
    const { written, transaction } = fakeDatabase();

    await expect(
      provisionDirectoryApplicant("actor-id", identity),
    ).resolves.toBe("app-user");
    expect(written).toContainEqual({
      table: users,
      values: expect.objectContaining({
        email: "person@example.test",
        displayName: "Person Name",
        status: "active",
        userType: "applicant",
      }),
    });
    expect(written).toContainEqual({
      table: userIdentities,
      values: expect.objectContaining({
        userId: "app-user",
        provider: "firebase",
        subject: "firebase-user",
        emailVerified: false,
      }),
    });
    expect(transaction.execute).toHaveBeenCalledOnce();
    expect(written).toContainEqual({
      table: authorizationAuditEntries,
      values: expect.objectContaining({
        action: "user.provisioned",
        actorId: "actor-id",
        targetUserId: "app-user",
      }),
    });
  });

  it("rejects an existing email before linking or auditing", async () => {
    const { written } = fakeDatabase({ userCreated: false });

    await expect(
      provisionDirectoryApplicant("actor-id", identity),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(written).toHaveLength(1);
  });

  it("rejects a missing applicant role before auditing", async () => {
    const { written } = fakeDatabase({ roleAssigned: false });

    await expect(
      provisionDirectoryApplicant("actor-id", identity),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(written.some((entry) => entry.table === authorizationAuditEntries)).toBe(false);
  });
});
