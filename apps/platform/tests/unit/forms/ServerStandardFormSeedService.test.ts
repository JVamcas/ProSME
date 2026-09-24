import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/StandardFormSeedRepository", () => ({
  insertMissingStandardForms: vi.fn(),
}));

import { seedStandardForms } from "@/modules/forms/application/ServerStandardFormSeedService";
import { insertMissingStandardForms } from "@/modules/forms/infrastructure/StandardFormSeedRepository";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(insertMissingStandardForms).mockResolvedValue({
    createdCodes: [],
    skippedCodes: [],
  });
});

describe("ServerStandardFormSeedService", () => {
  it("validates and inserts system-owned forms without a user", async () => {
    await seedStandardForms();

    expect(insertMissingStandardForms).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FUNDING_APPLICATION",
          publishOnSeed: true,
        }),
        expect.objectContaining({ code: "TECHNICAL_REVIEW" }),
        expect.objectContaining({ code: "MONITORING_REVIEW" }),
      ]),
    );
  });
});
