import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/funding-calls/application/ServerFundingCallThumbnailService", () => ({
  readFundingCallThumbnail: vi.fn(),
  readPublicFundingCallThumbnail: vi.fn(),
  removeFundingCallThumbnail: vi.fn(),
  uploadFundingCallThumbnail: vi.fn(),
}));

import * as adminRoute from "@/app/api/admin/funding-calls/[id]/thumbnail/route";
import * as publicRoute from "@/app/api/public/funding-calls/[fundingCallId]/thumbnail/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  readFundingCallThumbnail,
  readPublicFundingCallThumbnail,
} from "@/modules/funding-calls/application/ServerFundingCallThumbnailService";

const callId = "20000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
  vi.mocked(readFundingCallThumbnail).mockResolvedValue({
    body: Buffer.from("thumbnail"), contentType: "image/webp",
  });
  vi.mocked(readPublicFundingCallThumbnail).mockResolvedValue({
    body: Buffer.from("thumbnail"), contentType: "image/webp",
  });
});

describe("funding-call thumbnail routes", () => {
  it("passes the requested public size and returns the stored WebP", async () => {
    const response = await publicRoute.GET(
      new Request(`http://localhost/api/public/funding-calls/${callId}/thumbnail?width=640`),
      { params: Promise.resolve({ fundingCallId: callId }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await response.text()).toBe("thumbnail");
    expect(readPublicFundingCallThumbnail).toHaveBeenCalledWith(callId, undefined, 640);
  });

  it("retains the default size for existing public thumbnail URLs", async () => {
    const response = await publicRoute.GET(
      new Request(`http://localhost/api/public/funding-calls/${callId}/thumbnail`),
      { params: Promise.resolve({ fundingCallId: callId }) },
    );
    expect(response.status).toBe(200);
    expect(readPublicFundingCallThumbnail).toHaveBeenCalledWith(callId, undefined, undefined);
  });

  it.each(["0", "-1", "640.5", "3841", "invalid"])(
    "rejects an invalid width %s before accessing storage",
    async (width) => {
      const response = await publicRoute.GET(
        new Request(`http://localhost/api/public/funding-calls/${callId}/thumbnail?width=${width}`),
        { params: Promise.resolve({ fundingCallId: callId }) },
      );
      expect(response.status).toBe(400);
      expect(readPublicFundingCallThumbnail).not.toHaveBeenCalled();
    },
  );

  it("resolves the user for the private editor preview", async () => {
    const response = await adminRoute.GET(
      new Request(`http://localhost/api/admin/funding-calls/${callId}/thumbnail?v=123&width=320`),
      { params: Promise.resolve({ id: callId }) },
    );
    expect(response.status).toBe(200);
    expect(resolveUserFromHeaders).toHaveBeenCalledOnce();
    expect(readFundingCallThumbnail).toHaveBeenCalledWith(null, callId, undefined, 320);
    expect(response.headers.get("Cache-Control")).toContain("private");
  });

  it("validates the private thumbnail width", async () => {
    const response = await adminRoute.GET(
      new Request(`http://localhost/api/admin/funding-calls/${callId}/thumbnail?width=bad`),
      { params: Promise.resolve({ id: callId }) },
    );
    expect(response.status).toBe(400);
    expect(readFundingCallThumbnail).not.toHaveBeenCalled();
  });

  it("does not expose unavailable public thumbnails", async () => {
    vi.mocked(readPublicFundingCallThumbnail).mockRejectedValueOnce(new Error("Not public"));
    const response = await publicRoute.GET(
      new Request(`http://localhost/api/public/funding-calls/${callId}/thumbnail?width=320`),
      { params: Promise.resolve({ fundingCallId: callId }) },
    );
    expect(response.status).toBe(404);
  });
});
