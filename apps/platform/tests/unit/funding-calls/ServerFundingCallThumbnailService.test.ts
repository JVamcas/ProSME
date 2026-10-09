import "../../support/FundingCallThumbnailTestMocks";
import { describe, expect, it, vi } from "vitest";
import {
  actorId,
  callId,
  stored,
  user,
  storage,
  png,
} from "../../support/FundingCallThumbnailTestFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  removeFundingCallThumbnail,
  uploadFundingCallThumbnail,
} from "@/modules/funding-calls/application/ServerFundingCallThumbnailService";

import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { updateFundingCallThumbnailRecord } from "@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository";

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

    expect(objectStorage.put).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/webp",
      }),
    );
    expect(objectStorage.put).toHaveBeenCalledTimes(3);
    expect(updateFundingCallThumbnailRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        expectedRowVersion: 3,
        fundingCallId: callId,
        thumbnail: {
          contentType: "image/webp",
          fileName: "call.webp",
          objectKey: expect.stringMatching(
            /thumbnail-v1-[0-9a-f-]+\/1024\.webp$/,
          ),
        },
      }),
    );
    expect(result.rowVersion).toBe(4);
    expect(result.thumbnailUrl).toContain(
      `/api/admin/funding-calls/${callId}/thumbnail`,
    );
  });

  it("denies users without draft-edit permission", async () => {
    await expect(
      uploadFundingCallThumbnail(user([]), callId, 3, await png(), storage()),
    ).rejects.toThrow();
    expect(readFundingCallById).not.toHaveBeenCalled();
  });

  it("rejects a stale row version before writing storage", async () => {
    vi.mocked(readFundingCallById).mockReset().mockResolvedValue(stored);
    const objectStorage = storage();
    await expect(
      uploadFundingCallThumbnail(
        user([permissionCodes.fundingCallEditDraft]),
        callId,
        2,
        await png(),
        objectStorage,
      ),
    ).rejects.toThrow("funding call changed");
    expect(objectStorage.put).not.toHaveBeenCalled();
  });

  it("rejects oversized uploads before buffering or writing", async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    const readFile = vi.spyOn(file, "arrayBuffer");
    const objectStorage = storage();
    await expect(
      uploadFundingCallThumbnail(
        user([permissionCodes.fundingCallEditDraft]),
        callId,
        3,
        file,
        objectStorage,
      ),
    ).rejects.toThrow("no larger than 2 MB");
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
    await expect(
      uploadFundingCallThumbnail(
        user([permissionCodes.fundingCallEditDraft]),
        callId,
        3,
        file,
        objectStorage,
      ),
    ).rejects.toThrow("cannot be decoded");
    expect(objectStorage.put).not.toHaveBeenCalled();
    expect(updateFundingCallThumbnailRecord).not.toHaveBeenCalled();
  });

  it.each(["conflict", "database", "storage"])(
    "cleans all new sizes after a %s failure and preserves the previous thumbnail",
    async (failure) => {
      const objectStorage = storage();
      const previousKey = "funding-calls/previous.png";
      vi.mocked(readFundingCallById)
        .mockReset()
        .mockResolvedValue({
          ...stored,
          thumbnailObjectKey: previousKey,
        });
      if (failure === "conflict") {
        vi.mocked(updateFundingCallThumbnailRecord).mockResolvedValue(false);
      } else if (failure === "database") {
        vi.mocked(updateFundingCallThumbnailRecord).mockRejectedValue(
          new Error("Database failure"),
        );
      } else {
        vi.mocked(objectStorage.put).mockRejectedValueOnce(
          new Error("Storage failure"),
        );
      }
      await expect(
        uploadFundingCallThumbnail(
          user([permissionCodes.fundingCallEditDraft]),
          callId,
          3,
          await png(),
          objectStorage,
        ),
      ).rejects.toThrow();
      expect(objectStorage.delete).toHaveBeenCalledTimes(3);
      expect(objectStorage.delete).not.toHaveBeenCalledWith(previousKey);
      for (const width of [320, 640, 1024]) {
        expect(objectStorage.delete).toHaveBeenCalledWith(
          expect.stringContaining(`/${width}.webp`),
        );
      }
      if (failure === "storage") {
        expect(updateFundingCallThumbnailRecord).not.toHaveBeenCalled();
      }
    },
  );

  it("removes all sizes after the thumbnail metadata is removed", async () => {
    const key = `funding-calls/${callId}/thumbnail-v1-${callId}/1024.webp`;
    vi.mocked(readFundingCallById)
      .mockReset()
      .mockResolvedValue({
        ...stored,
        thumbnailObjectKey: key,
      });
    vi.mocked(updateFundingCallThumbnailRecord).mockResolvedValue(true);
    const objectStorage = storage();
    await removeFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      3,
      objectStorage,
    );
    expect(updateFundingCallThumbnailRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnail: null,
      }),
    );
    expect(objectStorage.delete).toHaveBeenCalledTimes(3);
  });
});
