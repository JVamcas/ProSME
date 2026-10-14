import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/forms/application/ServerFormsService", () => ({
  getForms: vi.fn(),
  createNewForm: vi.fn(),
}));

import { GET } from "@/app/api/admin/forms/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { getForms } from "@/modules/forms/application/ServerFormsService";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
});

describe("forms list route", () => {
  it("validates pagination and returns page metadata", async () => {
    vi.mocked(getForms).mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
    const response = await GET(
      new Request("http://localhost/api/admin/forms?page=2&pageSize=10"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(getForms).toHaveBeenCalledWith(null, { page: 2, pageSize: 10 });
    expect(body.data).toEqual([]);
    expect(body.page).toEqual({
      nextCursor: "3",
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it("passes the validated term and request context to the protected service", async () => {
    vi.mocked(getForms).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });
    const response = await GET(
      new Request("http://localhost/api/admin/forms?search=%20Review%20"),
    );
    expect(response.status).toBe(200);
    expect(getForms).toHaveBeenCalledWith(null, {
      page: 1,
      pageSize: 10,
      search: "Review",
    });
  });

  it("rejects oversized terms before invoking the service", async () => {
    const response = await GET(
      new Request(`http://localhost/api/admin/forms?search=${"a".repeat(201)}`),
    );
    expect(response.status).toBe(400);
    expect(getForms).not.toHaveBeenCalled();
  });
});
