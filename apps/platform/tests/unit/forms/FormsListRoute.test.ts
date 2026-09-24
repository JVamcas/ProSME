import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/forms/application/ServerFormsService", () => ({
  createNewForm: vi.fn(),
  getForms: vi.fn().mockResolvedValue({
    items: [{ id: "form-1", name: "First form" }],
    page: 2,
    pageSize: 10,
    total: 21,
    totalPages: 3,
  }),
}));

import { GET } from "@/app/api/admin/forms/route";
import { getForms } from "@/modules/forms/application/ServerFormsService";

describe("forms list route", () => {
  it("validates pagination and returns page metadata", async () => {
    const response = await GET(new Request(
      "http://localhost/api/admin/forms?page=2&pageSize=10",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getForms).toHaveBeenCalledWith(null, { page: 2, pageSize: 10 });
    expect(body.data).toEqual([{ id: "form-1", name: "First form" }]);
    expect(body.page).toEqual({
      nextCursor: "3",
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });
});
