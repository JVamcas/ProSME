import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn().mockResolvedValue(null),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowStageFunnelService",
  () => ({
    getWorkflowStageFunnel: vi.fn(),
    listWorkflowStageApplications: vi.fn(),
    exportWorkflowStageApplications: vi.fn(),
  }),
);
import { GET } from "@/app/api/applications/[id]/workflow-stage-funnel/route";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import {
  getWorkflowStageFunnel,
  listWorkflowStageApplications,
  exportWorkflowStageApplications,
} from "@/modules/workflows/application/runtime/ServerWorkflowStageFunnelService";

const id = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id }) };
const request = (query = "") =>
  new Request(
    `http://localhost/api/applications/${id}/workflow-stage-funnel${query}`,
  );
beforeEach(() => vi.resetAllMocks());

describe("stage funnel transport", () => {
  it("returns a private summary", async () => {
    vi.mocked(getWorkflowStageFunnel).mockResolvedValue({
      fundingCallTitle: "Growth",
      stages: [],
    });
    const response = await GET(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect((await response.json()).data.fundingCallTitle).toBe("Growth");
  });
  it("validates stage queries and pagination", async () => {
    expect(
      (await GET(request("?stageKey=FINANCIAL&pageSize=999"), context)).status,
    ).toBe(400);
    expect(listWorkflowStageApplications).not.toHaveBeenCalled();
  });
  it("delegates the paginated query", async () => {
    vi.mocked(listWorkflowStageApplications).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 25,
    });
    expect(
      (await GET(request("?stageKey=FINANCIAL&page=2"), context)).status,
    ).toBe(200);
    expect(
      vi.mocked(listWorkflowStageApplications).mock.calls[0]?.slice(1),
    ).toEqual([id, { stageKey: "FINANCIAL", page: 2, pageSize: 25 }]);
  });
  it("returns an attachment for downloads", async () => {
    vi.mocked(exportWorkflowStageApplications).mockResolvedValue({
      body: Buffer.from("Reference\r\nAPP-1"),
      contentType: "text/csv",
      fileName: "stage.csv",
    });
    const response = await GET(
      request("?stageKey=FINANCIAL&download=csv"),
      context,
    );
    expect(response.headers.get("Content-Disposition")).toContain("stage.csv");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.text()).toContain("APP-1");
  });
  it("translates denied access", async () => {
    vi.mocked(getWorkflowStageFunnel).mockRejectedValue(
      new PermissionDeniedError("workflow.instance.all.read"),
    );
    expect((await GET(request(), context)).status).toBe(403);
  });
});
