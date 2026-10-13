import { beforeEach, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/ServerAdminApplicationService", () => ({
  listAdminApplications: vi.fn(),
}));
import { listAdminApplications } from "@/modules/applications/ServerAdminApplicationService";
import { exportAdminApplications } from "@/modules/applications/ServerAdminApplicationExportService";
import { permissionCodes } from "@/auth/authorization/permissions";
import { workflowTaskActorFixture } from "../../support/WorkflowTaskServiceFixture";
import type { AdminApplicationListRow } from "@/modules/applications/ApplicationTypes";

function actor(codes: string[]) {
  return {
    ...workflowTaskActorFixture,
    id: "20000000-0000-4000-8000-000000000002",
    capabilities: new Set(codes),
  };
}
const input = {
  status: "under-review" as const,
  fundingCallId: "30000000-0000-4000-8000-000000000003",
  stage: "Screening",
  gender: "Female" as const,
  ageMin: 18,
  submittedFrom: "2026-10-01",
  submittedTo: "2026-10-13",
};
const row: AdminApplicationListRow = {
  applicationId: "10000000-0000-4000-8000-000000000001",
  reference: "TEST-001",
  applicantName: "=Unsafe formula",
  businessName: 'Synthetic, "Business"',
  fundingCallTitle: "Growth call",
  applicantStatus: "UNDER_REVIEW",
  activeStageName: "Screening",
  submittedAt: "2026-10-13T12:00:00.000Z",
  activeTaskCount: 1,
  assignedRoleName: null,
  assignedUserName: null,
  dueAt: null,
  internalStatus: "Screening",
  priority: null,
  requestedAmount: null,
  rowVersion: 1,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAdminApplications)
    .mockResolvedValueOnce({ items: [row], total: 2, nextCursor: "next-page" })
    .mockResolvedValueOnce({
      items: [{ ...row, reference: "TEST-002" }],
      total: 2,
      nextCursor: null,
    });
});
it.each(["CSV", "XLSX"] as const)(
  "exports every page with the same filters in %s",
  async (format) => {
    const user = actor([
      permissionCodes.fundingApplicationExport,
      permissionCodes.workflowTaskAssignedRead,
    ]);
    const file = await exportAdminApplications(
      user,
      { ...input, format },
      AbortSignal.timeout(10000),
    );
    expect(listAdminApplications).toHaveBeenNthCalledWith(
      1,
      user,
      expect.objectContaining({ ...input, limit: 100, after: undefined }),
      { includeTotal: false },
    );
    expect(listAdminApplications).toHaveBeenNthCalledWith(
      2,
      user,
      expect.objectContaining({ ...input, limit: 100, after: "next-page" }),
      { includeTotal: false },
    );
    expect(file.fileName).toBe(`applications.${format.toLowerCase()}`);
    if (format === "CSV") {
      const csv = file.body.toString("utf8");
      expect(csv).toContain(
        '"Application ID","Reference","Applicant","Business","Funding call"',
      );
      expect(csv).toContain('"TEST-001"');
      expect(csv).toContain('"TEST-002"');
      expect(csv).toContain("'=Unsafe formula");
      expect(csv).toContain('"Synthetic, ""Business"""');
      expect(csv).toContain("14:00");
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(new Uint8Array(file.body).buffer);
      const sheet = workbook.worksheets[0];
      expect(sheet.rowCount).toBe(3);
      expect(sheet.getRow(2).getCell(3).value).toBe("=Unsafe formula");
      expect(sheet.getRow(3).getCell(2).value).toBe("TEST-002");
    }
  },
);
it.each([
  { codes: [] },
  { codes: [permissionCodes.fundingApplicationAllRead] },
  { codes: [permissionCodes.fundingApplicationExport] },
])("requires both export and scoped read access: %j", async ({ codes }) => {
  await expect(
    exportAdminApplications(
      actor(codes),
      { ...input, format: "CSV" },
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(listAdminApplications).not.toHaveBeenCalled();
});
it("validates filters before querying", async () => {
  await expect(
    exportAdminApplications(
      actor([
        permissionCodes.fundingApplicationExport,
        permissionCodes.fundingApplicationAllRead,
      ]),
      { ...input, fundingCallId: "invalid", format: "CSV" },
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(listAdminApplications).not.toHaveBeenCalled();
});
it("exports headers for an empty result", async () => {
  vi.mocked(listAdminApplications)
    .mockReset()
    .mockResolvedValue({ items: [], total: 0, nextCursor: null });
  const file = await exportAdminApplications(
    actor([
      permissionCodes.fundingApplicationExport,
      permissionCodes.fundingApplicationAllRead,
    ]),
    { ...input, format: "CSV" },
    new AbortController().signal,
  );
  expect(file.body.toString("utf8").trim().split("\r\n")).toHaveLength(1);
});
