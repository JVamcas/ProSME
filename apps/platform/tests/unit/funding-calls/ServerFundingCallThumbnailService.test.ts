import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/PublicFundingCallRepository", () => ({
  readPublicFundingCallById: vi.fn(),
}));
vi.mock("@/integrations/storage/GcsObjectPath", () => ({
  gcsObjectPathSegments: { utilities: { fundingCalls: ["funding-calls"] } },
  resolveGcsObjectPath: (...segments: string[]) => segments.join("/"),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository", () => ({
  updateFundingCallThumbnailRecord: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import {
  readFundingCallThumbnail,
  readPublicFundingCallThumbnail,
  removeFundingCallThumbnail,
  uploadFundingCallThumbnail,
} from "@/modules/funding-calls/application/ServerFundingCallThumbnailService";
import { readPublicFundingCallById } from "@/modules/funding-calls/infrastructure/PublicFundingCallRepository";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { updateFundingCallThumbnailRecord } from "@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "20000000-0000-4000-8000-000000000001";
const stored = {
  allowResubmissionAfterWithdrawal: false,
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: new Date("2027-03-01T00:00:00.000Z"),
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  createdBy: actorId,
  description: "Funding call",
  eligibilityRuleSetVersionId: null,
  eligibilitySummary: null,
  formVersionId: null,
  fundingInstrument: null,
  id: callId,
  maximumGrantAmount: "100000.00",
  minimumGrantAmount: "10000.00",
  opensAt: new Date("2027-01-01T00:00:00.000Z"),
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "CALL-1",
  rowVersion: 3,
  slug: "call-1",
  status: "DRAFT" as const,
  suspendedFromStatus: null,
  thematicArea: null,
  thumbnailContentType: null,
  thumbnailFileName: null,
  thumbnailObjectKey: null,
  title: "Call 1",
  totalBudgetEnvelope: "1000000.00",
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedBy: actorId,
  workflowTemplateVersionId: null,
};

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Funding administrator",
    email: "funding@example.test",
    id: actorId,
    identitySubject: "funding-admin",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

function storage(): DocumentStorage {
  return {
    delete: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
    read: vi.fn(async () => Buffer.alloc(0)),
  };
}

async function png() {
  const body = await sharp({
    create: { width: 1200, height: 675, channels: 3, background: "green" },
  }).png().toBuffer();
  return new File([new Uint8Array(body)], "call.png", { type: "image/png" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallById)
    .mockReset()
    .mockResolvedValueOnce(stored)
    .mockResolvedValueOnce({
      ...stored,
      rowVersion: 4,
      thumbnailContentType: "image/png",
      thumbnailFileName: "call.png",
      thumbnailObjectKey: "funding-calls/object.png",
    });
  vi.mocked(updateFundingCallThumbnailRecord).mockResolvedValue(true);
});

describe("funding call thumbnail service", () => {
  it("uploads a valid thumbnail for an editable draft", async () => {
    const objectStorage = storage();
    const result = await uploadFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      3,
      await png(),
      objectStorage,
    );

    expect(objectStorage.put).toHaveBeenCalledWith(expect.objectContaining({
      contentType: "image/webp",
    }));
    expect(objectStorage.put).toHaveBeenCalledTimes(3);
    expect(updateFundingCallThumbnailRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        expectedRowVersion: 3,
        fundingCallId: callId,
        thumbnail: {
          contentType: "image/webp",
          fileName: "call.webp",
          objectKey: expect.stringMatching(/thumbnail-v1-[0-9a-f-]+\/1024\.webp$/),
        },
      }),
    );
    expect(result.rowVersion).toBe(4);
    expect(result.thumbnailUrl).toContain(`/api/admin/funding-calls/${callId}/thumbnail`);
  });

  it("denies users without draft-edit permission", async () => {
    await expect(uploadFundingCallThumbnail(
      user([]),
      callId,
      3,
      await png(),
      storage(),
    )).rejects.toThrow();
    expect(readFundingCallById).not.toHaveBeenCalled();
  });

  it("rejects a stale row version before writing storage", async () => {
    vi.mocked(readFundingCallById).mockReset().mockResolvedValue(stored);
    const objectStorage = storage();
    await expect(uploadFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      2,
      await png(),
      objectStorage,
    )).rejects.toThrow("funding call changed");
    expect(objectStorage.put).not.toHaveBeenCalled();
  });

  it("rejects oversized uploads before buffering or writing", async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    const readFile = vi.spyOn(file, "arrayBuffer");
    const objectStorage = storage();
    await expect(uploadFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]), callId, 3, file, objectStorage,
    )).rejects.toThrow("no larger than 2 MB");
    expect(readFile).not.toHaveBeenCalled();
    expect(objectStorage.put).not.toHaveBeenCalled();
  });

  it("rejects corrupt image bytes before writing", async () => {
    const file = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
      "broken.png",
      { type: "image/png" },
    );
    const objectStorage = storage();
    await expect(uploadFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]), callId, 3, file, objectStorage,
    )).rejects.toThrow("cannot be decoded");
    expect(objectStorage.put).not.toHaveBeenCalled();
    expect(updateFundingCallThumbnailRecord).not.toHaveBeenCalled();
  });

  it.each(["conflict", "database", "storage"])(
    "cleans all new sizes after a %s failure and preserves the previous thumbnail",
    async (failure) => {
      const objectStorage = storage();
      const previousKey = "funding-calls/previous.png";
      vi.mocked(readFundingCallById).mockReset().mockResolvedValue({
        ...stored, thumbnailObjectKey: previousKey,
      });
      if (failure === "conflict") {
        vi.mocked(updateFundingCallThumbnailRecord).mockResolvedValue(false);
      } else if (failure === "database") {
        vi.mocked(updateFundingCallThumbnailRecord).mockRejectedValue(new Error("Database failure"));
      } else {
        vi.mocked(objectStorage.put).mockRejectedValueOnce(new Error("Storage failure"));
      }
      await expect(uploadFundingCallThumbnail(
        user([permissionCodes.fundingCallEditDraft]), callId, 3, await png(), objectStorage,
      )).rejects.toThrow();
      expect(objectStorage.delete).toHaveBeenCalledTimes(3);
      expect(objectStorage.delete).not.toHaveBeenCalledWith(previousKey);
      for (const width of [320, 640, 1024]) {
        expect(objectStorage.delete).toHaveBeenCalledWith(expect.stringContaining(`/${width}.webp`));
      }
      if (failure === "storage") {
        expect(updateFundingCallThumbnailRecord).not.toHaveBeenCalled();
      }
    },
  );

  it("removes all sizes after the thumbnail metadata is removed", async () => {
    const key = `funding-calls/${callId}/thumbnail-v1-${callId}/1024.webp`;
    vi.mocked(readFundingCallById).mockReset().mockResolvedValue({
      ...stored, thumbnailObjectKey: key,
    });
    vi.mocked(updateFundingCallThumbnailRecord).mockResolvedValue(true);
    const objectStorage = storage();
    await removeFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]), callId, 3, objectStorage,
    );
    expect(updateFundingCallThumbnailRecord).toHaveBeenCalledWith(expect.objectContaining({
      thumbnail: null,
    }));
    expect(objectStorage.delete).toHaveBeenCalledTimes(3);
  });

  it("serves the selected size through authorized admin and published public reads", async () => {
    const call = {
      ...stored,
      thumbnailContentType: "image/webp",
      thumbnailObjectKey: `funding-calls/${callId}/thumbnail-v1-${callId}/1024.webp`,
    };
    vi.mocked(readFundingCallById).mockReset().mockResolvedValue(call);
    vi.mocked(readPublicFundingCallById).mockResolvedValue({
      ...call, status: "LIVE", publicDocuments: [],
    });
    const objectStorage = storage();
    await readFundingCallThumbnail(user([permissionCodes.fundingCallRead]), callId, objectStorage, 192);
    await readPublicFundingCallThumbnail(callId, objectStorage, 500);
    await readPublicFundingCallThumbnail(callId, objectStorage, 1920);
    expect(objectStorage.read).toHaveBeenNthCalledWith(1, call.thumbnailObjectKey.replace("1024.webp", "320.webp"));
    expect(objectStorage.read).toHaveBeenNthCalledWith(2, call.thumbnailObjectKey.replace("1024.webp", "640.webp"));
    expect(objectStorage.read).toHaveBeenNthCalledWith(3, call.thumbnailObjectKey);
  });

  it("continues serving existing original thumbnails", async () => {
    vi.mocked(readFundingCallById).mockReset().mockResolvedValue({
      ...stored, thumbnailContentType: "image/png", thumbnailObjectKey: "old.png",
    });
    const objectStorage = storage();
    const result = await readFundingCallThumbnail(
      user([permissionCodes.fundingCallRead]), callId, objectStorage, 320,
    );
    expect(objectStorage.read).toHaveBeenCalledWith("old.png");
    expect(result.contentType).toBe("image/png");
  });

  it("denies thumbnail reads before accessing private storage", async () => {
    const objectStorage = storage();
    await expect(readFundingCallThumbnail(user([]), callId, objectStorage, 320)).rejects.toThrow();
    expect(readFundingCallById).not.toHaveBeenCalled();
    expect(objectStorage.read).not.toHaveBeenCalled();
  });

  it("does not serve unpublished calls through the public thumbnail API", async () => {
    vi.mocked(readPublicFundingCallById).mockResolvedValue(null);
    const objectStorage = storage();
    await expect(readPublicFundingCallThumbnail(callId, objectStorage, 320)).rejects.toThrow("not found");
    expect(objectStorage.read).not.toHaveBeenCalled();
  });
});
