import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/eligibility/infrastructure/StandardEligibilitySeedRepository",
  () => ({ insertStandardEligibilityBaseline: vi.fn() }),
);

import { seedStandardEligibilityBaseline } from "@/modules/eligibility/application/standard/ServerStandardEligibilitySeedService";
import { insertStandardEligibilityBaseline } from "@/modules/eligibility/infrastructure/StandardEligibilitySeedRepository";

const approvedAt = new Date("2026-09-22T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(insertStandardEligibilityBaseline).mockResolvedValue({
    boundFundingCallReferences: ["CALL-2027-01"],
    created: true,
    definitionId: "10000000-0000-4000-8000-000000000001",
    issueMessages: [],
    synchronized: true,
    versionId: "20000000-0000-4000-8000-000000000001",
  });
});

describe("standard Eligibility seed service", () => {
  it("passes explicit approval and Funding Call bindings to the seed", async () => {
    const result = await seedStandardEligibilityBaseline({
      approvedAt,
      approvedBy: " Repository owner ",
      fundingCallReferences: ["CALL-2027-01"],
    });

    expect(insertStandardEligibilityBaseline).toHaveBeenCalledWith({
      approvedAt,
      approvedBy: "Repository owner",
      fundingCallReferences: ["CALL-2027-01"],
    });
    expect(result).toMatchObject({
      boundFundingCallReferences: ["CALL-2027-01"],
      created: true,
      issueMessages: [],
    });
  });
});
