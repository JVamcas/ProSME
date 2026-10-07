import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/reporting/ServerWebsiteReportService", () => ({
  getSavedWebsiteReports: vi.fn(),
  getSavedWebsiteReport: vi.fn(),
  getWebsiteReportSchedules: vi.fn(),
  saveWebsiteReportSchedule: vi.fn(),
}));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  getSavedWebsiteReports,
  getSavedWebsiteReport,
  saveWebsiteReportSchedule,
} from "@/modules/reporting/ServerWebsiteReportService";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { GET as list } from "@/app/api/reporting/website-reports/route";
import { GET as detail } from "@/app/api/reporting/website-reports/[reportId]/route";
import { PATCH as update } from "@/app/api/reporting/website-schedules/[scheduleId]/route";

const id = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
});
describe("website reporting API transport", () => {
  it("bounds report history and rejects unsupported filters before use case execution", async () => {
    expect(
      (
        await list(
          new Request(
            "http://localhost/api/reporting/website-reports?pageSize=1000",
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await list(
          new Request(
            "http://localhost/api/reporting/website-reports?frequency=DAILY",
          ),
        )
      ).status,
    ).toBe(400);
    expect(getSavedWebsiteReports).not.toHaveBeenCalled();
  });
  it("forwards validated list/detail scopes with no-store responses", async () => {
    vi.mocked(getSavedWebsiteReports).mockResolvedValue({
      rows: [],
      total: 0,
      page: 2,
      pageSize: 20,
    });
    const response = await list(
      new Request(
        "http://localhost/api/reporting/website-reports?frequency=MONTHLY&page=2",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getSavedWebsiteReports).toHaveBeenCalledWith(null, {
      frequency: "MONTHLY",
      page: 2,
      pageSize: 20,
    });
    await detail(new Request("http://localhost"), {
      params: Promise.resolve({ reportId: id }),
    });
    expect(getSavedWebsiteReport).toHaveBeenCalledWith(null, id);
  });
  it("maps schedule permission denial and rejects an independent recipient list", async () => {
    const input = {
      expectedVersion: 1,
      enabled: true,
      anchorDate: "2026-09-01",
      sendTime: "09:00",
      finalizationDelayHours: 48,
    };
    const request = (body: unknown) =>
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    const context = { params: Promise.resolve({ scheduleId: id }) };
    expect(
      (await update(request({ ...input, recipients: [] }), context)).status,
    ).toBe(400);
    expect(saveWebsiteReportSchedule).not.toHaveBeenCalled();
    vi.mocked(saveWebsiteReportSchedule).mockRejectedValue(
      new PermissionDeniedError("reporting.website-schedule.update.all"),
    );
    expect((await update(request(input), context)).status).toBe(403);
  });
});
