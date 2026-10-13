import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/forms/application/ServerFormConfigurationService", () => ({
  getTaskFormSearchContent: vi.fn(),
}));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { getTaskFormSearchContent } from "@/modules/forms/application/ServerFormConfigurationService";
import { POST } from "@/app/api/admin/forms/search-content/route";
const version = "10000000-0000-4000-8000-000000000001";
function request(versionIds: string[]) {
  return new Request("http://localhost/api/admin/forms/search-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionIds }),
  });
}
beforeEach(() => vi.clearAllMocks());
describe("workflow form search content route", () => {
  it("validates version identifiers and limits before invoking the service", async () => {
    expect((await POST(request(["invalid"]))).status).toBe(400);
    expect((await POST(request(Array(501).fill(version)))).status).toBe(400);
    expect(getTaskFormSearchContent).not.toHaveBeenCalled();
  });
  it("passes the resolved actor and exact version set and prevents response caching", async () => {
    const user = { id: "actor" } as never;
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
    vi.mocked(getTaskFormSearchContent).mockResolvedValue([]);
    const response = await POST(request([version]));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getTaskFormSearchContent).toHaveBeenCalledWith(user, [version]);
  });
});
