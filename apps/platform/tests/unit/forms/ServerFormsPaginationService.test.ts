import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  listForms: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { getForms } from "@/modules/forms/application/ServerFormsService";
import { listForms } from "@/modules/forms/infrastructure/FormRepository";

const actorId = "79e20de0-3558-4d63-90a4-8c9f5125df07";

function staff(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Forms User",
    email: "forms@example.test",
    id: actorId,
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    roleCodes: new Set(["programme_officer"]),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ServerFormsService pagination", () => {
  it("checks permission before listing forms", async () => {
    await expect(getForms(staff([]), { page: 1, pageSize: 10 }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(listForms).not.toHaveBeenCalled();
  });

  it("passes validated pagination to the form repository", async () => {
    vi.mocked(listForms).mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 25,
      total: 30,
      totalPages: 2,
    });

    await getForms(staff([permissionCodes.workflowFormRead]), {
      page: 2,
      pageSize: 25,
    });

    expect(listForms).toHaveBeenCalledWith({ page: 2, pageSize: 25 });
  });
});
