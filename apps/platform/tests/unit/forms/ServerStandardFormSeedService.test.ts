import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/StandardFormSeedRepository", () => ({
  insertMissingStandardFormDrafts: vi.fn(),
}));

import { seedStandardFormDrafts } from "@/modules/forms/application/ServerStandardFormSeedService";
import { insertMissingStandardFormDrafts } from "@/modules/forms/infrastructure/StandardFormSeedRepository";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(insertMissingStandardFormDrafts).mockResolvedValue({
    createdCodes: [],
    skippedCodes: [],
  });
});

describe("ServerStandardFormSeedService", () => {
  it("validates and inserts system-owned drafts without a user", async () => {
    await seedStandardFormDrafts();

    expect(insertMissingStandardFormDrafts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: "TECHNICAL_REVIEW" }),
        expect.objectContaining({ code: "MONITORING_REVIEW" }),
      ]),
    );
  });
});
