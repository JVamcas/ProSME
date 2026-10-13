import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/client-http", () => ({
  requestBlob: vi.fn(),
  requestJson: vi.fn(),
  requestData: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
}));
vi.mock("@/modules/reporting/ClientWebsiteAnalyticsService", () => ({
  clientWebsiteAnalyticsService: { track: vi.fn() },
}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/applications/ServerAdminApplicationService", () => ({
  listAdminApplications: vi.fn(),
}));

import { requestJson, requestBlob } from "@/lib/client-http";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { clientApplicationService } from "@/modules/applications/ClientApplicationService";
import { listAdminApplications } from "@/modules/applications/ServerAdminApplicationService";
import { GET } from "@/app/api/admin/applications/route";

beforeEach(() => vi.clearAllMocks());

describe("application filter transport", () => {
  it("sends every filter, including a zero age bound, to the API", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      data: [],
      page: { total: 0, nextCursor: null },
    });
    await clientApplicationService.listAdminApplications({
      fundingCallId: "30000000-0000-4000-8000-000000000003",
      stage: "Screening",
      limit: 25,
      status: "closed",
      ageMin: 0,
      ageMax: 35,
      gender: "Female" as const,
      region: "Khomas",
      sector: "Blue economy",
      submittedFrom: "2026-10-01",
      submittedTo: "2026-10-12",
      submittedAfter: "2026-10-01T10:00:00Z",
      submittedBefore: "2026-10-12T10:00:00Z",
    });
    const url = new URL(
      vi.mocked(requestJson).mock.calls[0]![0],
      "http://localhost",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      fundingCallId: "30000000-0000-4000-8000-000000000003",
      stage: "Screening",
      limit: "25",
      status: "closed",
      ageMin: "0",
      ageMax: "35",
      gender: "Female" as const,
      region: "Khomas",
      sector: "Blue economy",
      submittedFrom: "2026-10-01",
      submittedTo: "2026-10-12",
      submittedAfter: "2026-10-01T10:00:00Z",
      submittedBefore: "2026-10-12T10:00:00Z",
    });
  });

  it("validates filters and forwards the authenticated actor to the protected service", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
    vi.mocked(listAdminApplications).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });
    const response = await GET(
      new Request(
        "http://localhost/api/admin/applications?gender=Female&ageMin=18&region=Khomas&submittedFrom=2026-10-01&submittedTo=2026-10-12&submittedAfter=2026-10-01T10:00:00Z&submittedBefore=2026-10-12T10:00:00Z",
      ),
    );
    expect(response.status).toBe(200);
    expect(listAdminApplications).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        ageMin: 18,
        gender: "Female" as const,
        region: "Khomas",
        submittedFrom: "2026-10-01",
        submittedTo: "2026-10-12",
        submittedAfter: "2026-10-01T10:00:00Z",
        submittedBefore: "2026-10-12T10:00:00Z",
      }),
    );
  });

  it("rejects reversed dates before invoking the application service", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
    const response = await GET(
      new Request(
        "http://localhost/api/admin/applications?submittedFrom=2026-10-12&submittedTo=2026-10-01",
      ),
    );
    expect(response.status).toBe(400);
    expect(listAdminApplications).not.toHaveBeenCalled();
  });
});

it("exports applied filters without the visible page cursor or limit", async () => {
  vi.mocked(requestBlob).mockResolvedValue(new Blob());
  const input = {
    status: "under-review" as const,
    format: "CSV" as const,
    fundingCallId: "30000000-0000-4000-8000-000000000003",
    stage: "Screening",
    search: "Synthetic",
    ageMin: 0,
    gender: "Female" as const,
    after: "visible-page-cursor",
    limit: 25,
  };
  await clientApplicationService.exportApplications(input);
  const url = new URL(
    vi.mocked(requestBlob).mock.calls[0]![0],
    "http://localhost",
  );
  expect(Object.fromEntries(url.searchParams)).toEqual({
    status: "under-review",
    format: "CSV",
    fundingCallId: input.fundingCallId,
    stage: "Screening",
    search: "Synthetic",
    ageMin: "0",
    gender: "Female" as const,
  });
});

it("preserves repeated selections at the protected list route", async () => {
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
  vi.mocked(listAdminApplications).mockResolvedValue({
    items: [],
    total: 0,
    nextCursor: null,
  });
  const response = await GET(
    new Request(
      "http://localhost/api/admin/applications?stage=Screening&stage=Decision&status=closed&status=under-review&gender=Female&gender=Male",
    ),
  );
  expect(response.status).toBe(200);
  expect(listAdminApplications).toHaveBeenCalledWith(
    null,
    expect.objectContaining({
      stage: ["Screening", "Decision"],
      status: ["closed", "under-review"],
      gender: ["Female", "Male"],
    }),
  );
});
