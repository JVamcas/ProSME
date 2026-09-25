import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/applications/ServerAdminApplicationDetailService", () => ({
  getAdminApplicationDetail: vi.fn(),
}));

import { GET } from "@/app/api/admin/applications/[id]/detail/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getAdminApplicationDetail } from "@/modules/applications/ServerAdminApplicationDetailService";

const applicationId = "10000000-0000-4000-8000-000000000001";
const user = { id: "assigned-reviewer" } as never;

function request(id: string) {
  return GET(
    new Request(`http://localhost/api/admin/applications/${id}/detail`),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
});

describe("admin application detail route", () => {
  it("returns the detail model for an authorized assigned reviewer", async () => {
    const model = { title: "Growth Grant", reference: "SME-001" };
    vi.mocked(getAdminApplicationDetail).mockResolvedValue({
      model,
    } as never);

    const response = await request(applicationId);

    expect(response.status).toBe(200);
    expect(getAdminApplicationDetail).toHaveBeenCalledWith(
      user,
      applicationId,
      expect.any(String),
    );
    expect(await response.json()).toMatchObject({ data: model });
  });

  it("rejects an invalid application ID before reading detail", async () => {
    const response = await request("invalid");

    expect(response.status).toBe(400);
    expect(getAdminApplicationDetail).not.toHaveBeenCalled();
  });

  it("does not reveal an application outside the reviewer's scope", async () => {
    vi.mocked(getAdminApplicationDetail).mockRejectedValue(
      new ResourceNotFoundError("application"),
    );

    const response = await request(applicationId);

    expect(response.status).toBe(404);
  });
});
