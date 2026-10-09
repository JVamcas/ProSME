import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallVersionRepository",
  () => ({
    createFundingCallReplacement: vi.fn(),
    listFundingCallVersions: vi.fn(),
    readHistoricalFundingCall: vi.fn(),
  }),
);
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn() },
}));

import { GET, POST } from "@/app/api/admin/funding-calls/[id]/versions/route";
import { GET as getCall } from "@/app/api/admin/funding-calls/[id]/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  createFundingCallReplacement,
  listFundingCallVersions,
  readHistoricalFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";
import { callId, stored, user } from "../../support/FundingCallServiceFixture";

const versionId = "50000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id: callId }) };
const url = `http://localhost/api/admin/funding-calls/${callId}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(user([]));
  vi.mocked(createFundingCallReplacement).mockResolvedValue({
    ...stored,
    draftVersionId: versionId,
  });
  vi.mocked(listFundingCallVersions).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
  });
  vi.mocked(readHistoricalFundingCall).mockResolvedValue({
    ...stored,
    status: "LIVE",
  });
});

describe("funding call version routes", () => {
  it("denies history reads without the read permission", async () => {
    expect((await GET(new Request(`${url}/versions`), context)).status).toBe(
      403,
    );
    expect(listFundingCallVersions).not.toHaveBeenCalled();
  });

  it("denies replacement creation to read-only users", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([permissionCodes.fundingCallRead]),
    );
    const request = new Request(`${url}/versions`, {
      method: "POST",
      body: JSON.stringify({ expectedRowVersion: 1 }),
    });
    expect((await POST(request, context)).status).toBe(403);
    expect(createFundingCallReplacement).not.toHaveBeenCalled();
  });

  it("allows replacement creation with the exact edit permission", async () => {
    const actor = user([permissionCodes.fundingCallEditDraft]);
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
    const request = new Request(`${url}/versions`, {
      method: "POST",
      body: JSON.stringify({ expectedRowVersion: 1 }),
    });
    expect((await POST(request, context)).status).toBe(200);
    expect(createFundingCallReplacement).toHaveBeenCalledWith(
      actor.id,
      callId,
      1,
    );
  });

  it.each([0, -1, "invalid"])(
    "rejects invalid history page %s",
    async (page) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(
        user([permissionCodes.fundingCallRead]),
      );
      expect(
        (await GET(new Request(`${url}/versions?page=${page}`), context))
          .status,
      ).toBe(400);
      expect(listFundingCallVersions).not.toHaveBeenCalled();
    },
  );

  it("reads the requested page under the call identity", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([permissionCodes.fundingCallRead]),
    );
    expect(
      (await GET(new Request(`${url}/versions?page=2`), context)).status,
    ).toBe(200);
    expect(listFundingCallVersions).toHaveBeenCalledWith(callId, 2);
  });

  it("rejects history versions that do not belong to the requested call", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([permissionCodes.fundingCallRead]),
    );
    vi.mocked(readHistoricalFundingCall).mockResolvedValue(null);
    expect(
      (await getCall(new Request(`${url}?versionId=${versionId}`), context))
        .status,
    ).toBe(404);
    expect(readHistoricalFundingCall).toHaveBeenCalledWith(callId, versionId);
  });

  it("rejects stale replacement commands", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([permissionCodes.fundingCallEditDraft]),
    );
    vi.mocked(createFundingCallReplacement).mockResolvedValue(null);
    const request = new Request(`${url}/versions`, {
      method: "POST",
      body: JSON.stringify({ expectedRowVersion: 1 }),
    });
    expect((await POST(request, context)).status).toBe(409);
  });
});
