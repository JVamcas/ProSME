import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/StandardWorkflowSeedRepository",
  () => ({
    insertMissingStandardWorkflowDraft: vi.fn(),
    prepareStandardWorkflowSeedDependencies: vi.fn(),
  }),
);

import { seedStandardWorkflowDraft } from "@/modules/workflows/application/standard/ServerStandardWorkflowSeedService";
import { standardWorkflowRoleCodes } from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import {
  insertMissingStandardWorkflowDraft,
  prepareStandardWorkflowSeedDependencies,
} from "@/modules/workflows/infrastructure/StandardWorkflowSeedRepository";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prepareStandardWorkflowSeedDependencies).mockResolvedValue({
    formVersionIds: {
      TECHNICAL_REVIEW: "00000000-0000-4000-9000-000000000001",
    },
    formVersionStatuses: {
      TECHNICAL_REVIEW: "DRAFT",
    },
    roleIds: Object.fromEntries(
      standardWorkflowRoleCodes.map((code, index) => [
        code,
        `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ]),
    ) as Awaited<ReturnType<
      typeof prepareStandardWorkflowSeedDependencies
    >>["roleIds"],
    unresolvedFormCodes: ["FINANCE_REVIEW"],
  });
  vi.mocked(insertMissingStandardWorkflowDraft).mockResolvedValue({
    bindingsAdded: 1,
    created: true,
    definitionId: "00000000-0000-4000-a000-000000000001",
    versionId: "00000000-0000-4000-a000-000000000002",
  });
});

describe("standard workflow seed service", () => {
  it("validates and inserts the system-owned draft", async () => {
    const result = await seedStandardWorkflowDraft();

    expect(insertMissingStandardWorkflowDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "SME_FUND_STANDARD",
        graph: expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({
              stableKey: "ADMIN_ELIGIBILITY_SCREENING",
            }),
          ]),
        }),
      }),
    );
    expect(result.boundFormCodes).toEqual(["TECHNICAL_REVIEW"]);
    expect(result.boundDraftFormCodes).toEqual(["TECHNICAL_REVIEW"]);
    expect(result.boundPublishedFormCodes).toEqual([]);
    expect(result.unresolvedFormCodes).toEqual(["FINANCE_REVIEW"]);
  });
});
