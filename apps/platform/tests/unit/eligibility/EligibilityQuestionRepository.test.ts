import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
  getDatabase: () => ({ execute }),
}));

import { listEligibilityQuestions } from
  "@/modules/eligibility/infrastructure/EligibilityQuestionRepository";

describe("EligibilityQuestionRepository", () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it("returns the SQL-projected timestamp without assuming it is a Date", async () => {
    const updatedAt = "2026-09-23T05:06:07.123Z";
    execute
      .mockResolvedValueOnce({
        rows: [{
          active: true,
          applicantLabel: "Is the business in good standing with NAMRA?",
          bindingCount: 2,
          code: "NAMRA_STANDING",
          id: "question-id",
          inputType: "BOOLEAN",
          reviewerLabel: "Is the business in good standing with NAMRA?",
          rowVersion: 1,
          updatedAt,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const result = await listEligibilityQuestions({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.updatedAt).toBe(updatedAt);
  });
});
