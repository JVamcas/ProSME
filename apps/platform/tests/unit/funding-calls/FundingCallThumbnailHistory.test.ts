import "../../support/FundingCallThumbnailTestMocks";
import { describe, expect, it, vi } from "vitest";
import {
  callId,
  stored,
  user,
  storage,
} from "../../support/FundingCallThumbnailTestFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  readFundingCallThumbnail,
  readPublicFundingCallThumbnail,
  removeFundingCallThumbnail,
} from "@/modules/funding-calls/application/ServerFundingCallThumbnailService";
import { readPublicFundingCallById } from "@/modules/funding-calls/infrastructure/PublicFundingCallRepository";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { fundingCallThumbnailIsPublished } from "@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository";

import { readHistoricalFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";

describe("published thumbnail history and authorized reads", () => {
  it("preserves thumbnail files referenced by a published version", async () => {
    const key = "funding-calls/history.png";
    vi.mocked(readFundingCallById)
      .mockReset()
      .mockResolvedValue({ ...stored, thumbnailObjectKey: key });
    vi.mocked(fundingCallThumbnailIsPublished).mockResolvedValueOnce(true);
    const objectStorage = storage();
    await removeFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      3,
      objectStorage,
    );
    expect(objectStorage.delete).not.toHaveBeenCalled();
  });

  it("serves the selected historical thumbnail under its exact call version", async () => {
    const versionId = "50000000-0000-4000-8000-000000000001";
    const objectStorage = storage();
    vi.mocked(readHistoricalFundingCall).mockResolvedValue({
      ...stored,
      thumbnailContentType: "image/png",
      thumbnailObjectKey: "history.png",
      status: "LIVE",
      viewedPublishedVersionId: versionId,
    });
    await readFundingCallThumbnail(
      user([permissionCodes.fundingCallRead]),
      callId,
      objectStorage,
      640,
      versionId,
    );
    expect(readHistoricalFundingCall).toHaveBeenCalledWith(callId, versionId);
    expect(readFundingCallById).not.toHaveBeenCalled();
    expect(objectStorage.read).toHaveBeenCalledWith("history.png");
  });

  it("serves the selected size through authorized admin and published public reads", async () => {
    const call = {
      ...stored,
      thumbnailContentType: "image/webp",
      thumbnailObjectKey: `funding-calls/${callId}/thumbnail-v1-${callId}/1024.webp`,
    };
    vi.mocked(readFundingCallById).mockReset().mockResolvedValue(call);
    vi.mocked(readPublicFundingCallById).mockResolvedValue({
      ...call,
      status: "LIVE",
      publicDocuments: [],
    });
    const objectStorage = storage();
    await readFundingCallThumbnail(
      user([permissionCodes.fundingCallRead]),
      callId,
      objectStorage,
      192,
    );
    await readPublicFundingCallThumbnail(callId, objectStorage, 500);
    await readPublicFundingCallThumbnail(callId, objectStorage, 1920);
    expect(objectStorage.read).toHaveBeenNthCalledWith(
      1,
      call.thumbnailObjectKey.replace("1024.webp", "320.webp"),
    );
    expect(objectStorage.read).toHaveBeenNthCalledWith(
      2,
      call.thumbnailObjectKey.replace("1024.webp", "640.webp"),
    );
    expect(objectStorage.read).toHaveBeenNthCalledWith(
      3,
      call.thumbnailObjectKey,
    );
  });

  it("continues serving existing original thumbnails", async () => {
    vi.mocked(readFundingCallById)
      .mockReset()
      .mockResolvedValue({
        ...stored,
        thumbnailContentType: "image/png",
        thumbnailObjectKey: "old.png",
      });
    const objectStorage = storage();
    const result = await readFundingCallThumbnail(
      user([permissionCodes.fundingCallRead]),
      callId,
      objectStorage,
      320,
    );
    expect(objectStorage.read).toHaveBeenCalledWith("old.png");
    expect(result.contentType).toBe("image/png");
  });

  it("denies thumbnail reads before accessing private storage", async () => {
    const objectStorage = storage();
    await expect(
      readFundingCallThumbnail(user([]), callId, objectStorage, 320),
    ).rejects.toThrow();
    expect(readFundingCallById).not.toHaveBeenCalled();
    expect(objectStorage.read).not.toHaveBeenCalled();
  });

  it("does not serve unpublished calls through the public thumbnail API", async () => {
    vi.mocked(readPublicFundingCallById).mockResolvedValue(null);
    const objectStorage = storage();
    await expect(
      readPublicFundingCallThumbnail(callId, objectStorage, 320),
    ).rejects.toThrow("not found");
    expect(objectStorage.read).not.toHaveBeenCalled();
  });
});
