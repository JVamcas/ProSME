import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/forms/application/ServerFormsService", () => ({
  getForm: vi.fn().mockResolvedValue({ version: { versionNumber: 1 } }),
  updateFormDraft: vi.fn(),
}));

import { GET } from "@/app/api/admin/forms/[id]/route";
import { getForm } from "@/modules/forms/application/ServerFormsService";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";

const id = "20000000-0000-4000-8000-000000000002";
const versionId = "20000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };

beforeEach(() => vi.clearAllMocks());

describe("form version detail route", () => {
  it("passes the explicit version to the protected read service", async () => {
    const response = await GET(new Request(
      `http://localhost/api/admin/forms/${id}?versionId=${versionId}`,
    ), context);
    expect(response.status).toBe(200);
    expect(getForm).toHaveBeenCalledWith(null, id, versionId);
  });

  it("preserves default version selection when no version is supplied", async () => {
    const response = await GET(new Request(`http://localhost/api/admin/forms/${id}`), context);
    expect(response.status).toBe(200);
    expect(getForm).toHaveBeenCalledWith(null, id, undefined);
  });

  it("rejects an invalid version before invoking the service", async () => {
    const response = await GET(new Request(
      `http://localhost/api/admin/forms/${id}?versionId=invalid`,
    ), context);
    expect(response.status).toBe(400);
    expect(getForm).not.toHaveBeenCalled();
  });

  it("preserves read permission denial", async () => {
    vi.mocked(getForm).mockRejectedValueOnce(new PermissionDeniedError(permissionCodes.workflowFormRead));
    const response = await GET(new Request(
      `http://localhost/api/admin/forms/${id}?versionId=${versionId}`,
    ), context);
    expect(response.status).toBe(403);
  });
});
