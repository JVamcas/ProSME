import { beforeEach, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallVersionRepository",
  () => ({
    readHistoricalFundingCall: vi.fn(),
  }),
);
vi.mock(
  "@/modules/funding-calls/infrastructure/PublicFundingCallRepository",
  () => ({
    readPublicFundingCallById: vi.fn(),
  }),
);
vi.mock("@/integrations/storage/GcsObjectPath", () => ({
  gcsObjectPathSegments: { utilities: { fundingCalls: ["funding-calls"] } },
  resolveGcsObjectPath: (...segments: string[]) => segments.join("/"),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository",
  () => ({
    updateFundingCallThumbnailRecord: vi.fn(),
    fundingCallThumbnailIsPublished: vi.fn(async () => false),
  }),
);

import { stored } from "./FundingCallThumbnailTestFixture";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { updateFundingCallThumbnailRecord } from "@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository";

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
