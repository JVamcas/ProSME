import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/client-http", () => ({
  requestJson: vi.fn(), requestData: vi.fn(), patchData: vi.fn(), deleteData: vi.fn(),
}));
vi.mock("@/modules/reporting/ClientWebsiteAnalyticsService", () => ({
  clientWebsiteAnalyticsService: { track: vi.fn() },
}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));
vi.mock("@/modules/applications/ServerAdminApplicationService", () => ({ listAdminApplications: vi.fn() }));

import { requestJson } from "@/lib/client-http";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { clientApplicationService } from "@/modules/applications/ClientApplicationService";
import { listAdminApplications } from "@/modules/applications/ServerAdminApplicationService";
import { GET } from "@/app/api/admin/applications/route";

beforeEach(() => vi.clearAllMocks());

describe("application filter transport", () => {
  it("sends every filter, including a zero age bound, to the API", async () => {
    vi.mocked(requestJson).mockResolvedValue({ data: [], page: { total: 0, nextCursor: null } });
    await clientApplicationService.listAdminApplications({
      limit: 25, status: "closed", ageMin: 0, ageMax: 35, gender: "Female",
      region: "Khomas", sector: "Blue economy",
      submittedFrom: "2026-10-01", submittedTo: "2026-10-12",
      submittedAfter: "2026-10-01T10:00:00Z", submittedBefore: "2026-10-12T10:00:00Z",
    });
    const url = new URL(vi.mocked(requestJson).mock.calls[0]![0], "http://localhost");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "25", status: "closed", ageMin: "0", ageMax: "35", gender: "Female",
      region: "Khomas", sector: "Blue economy",
      submittedFrom: "2026-10-01", submittedTo: "2026-10-12",
      submittedAfter: "2026-10-01T10:00:00Z", submittedBefore: "2026-10-12T10:00:00Z",
    });
  });

  it("validates filters and forwards the authenticated actor to the protected service", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
    vi.mocked(listAdminApplications).mockResolvedValue({ items: [], total: 0, nextCursor: null });
    const response = await GET(new Request(
      "http://localhost/api/admin/applications?gender=Female&ageMin=18&region=Khomas&submittedFrom=2026-10-01&submittedTo=2026-10-12&submittedAfter=2026-10-01T10:00:00Z&submittedBefore=2026-10-12T10:00:00Z",
    ));
    expect(response.status).toBe(200);
    expect(listAdminApplications).toHaveBeenCalledWith(null, expect.objectContaining({
      ageMin: 18, gender: "Female", region: "Khomas",
      submittedFrom: "2026-10-01", submittedTo: "2026-10-12",
      submittedAfter: "2026-10-01T10:00:00Z", submittedBefore: "2026-10-12T10:00:00Z",
    }));
  });

  it("rejects reversed dates before invoking the application service", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
    const response = await GET(new Request(
      "http://localhost/api/admin/applications?submittedFrom=2026-10-12&submittedTo=2026-10-01",
    ));
    expect(response.status).toBe(400);
    expect(listAdminApplications).not.toHaveBeenCalled();
  });
});
