import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/platform/database/client";
import {
  readFundingCallKnowledgeSources,
  listFundingCallKnowledgeSources,
} from "@/modules/funding-calls/infrastructure/FundingCallKnowledgeRepository";
import {
  readFaqKnowledgeSources,
  listFaqKnowledgeSources,
} from "@/modules/content/infrastructure/FaqKnowledgeRepository";
import { readEligibilityKnowledgeSources } from "@/modules/eligibility/infrastructure/EligibilityKnowledgeRepository";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";

const dialect = new PgDialect();
const execute = vi.fn();
const transaction = { execute } as never;
beforeEach(() => {
  execute.mockReset().mockResolvedValue({ rows: [] });
  vi.mocked(getDatabase).mockReturnValue(transaction);
});

describe("source-owned knowledge SQL projections", () => {
  it("bounds public eligibility reads and rejects overlarge rule projections before loading trees", async () => {
    execute
      .mockResolvedValueOnce({
        rows: [{ id: chatbotId(20), versionNumber: 3 }],
      })
      .mockResolvedValueOnce({
        rows: Array.from({ length: 5001 }, () => ({ id: chatbotId(50) })),
      })
      .mockResolvedValueOnce({ rows: [] });
    await expect(
      readEligibilityKnowledgeSources([chatbotId(20)], transaction),
    ).rejects.toThrow(/bounded public export/);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(dialect.sqlToQuery(execute.mock.calls[1][0]).sql).toContain(
      "LIMIT 5001",
    );
  });
  it("projects public snapshot keys and never uses working bindings or full rows", async () => {
    await readFundingCallKnowledgeSources([chatbotId(10)], transaction);
    const query = dialect.sqlToQuery(execute.mock.calls[0][0]);
    expect(query.sql).toContain("p.id = c.current_published_version_id");
    expect(query.sql).toContain("p.snapshot->>'eligibilityRuleSetVersionId'");
    expect(query.sql).toContain("jsonb_build_object");
    expect(query.sql).toContain("FOR SHARE OF c, p");
    expect(query.sql).not.toMatch(
      /SELECT \*|formVersionId|workflowTemplateVersionId|thumbnailObjectKey|c\.eligibility_rule_set_version_id/,
    );
    expect(query.params).toContainEqual([chatbotId(10)]);
  });

  it("paginates more than 50 FAQs deterministically and excludes private review metadata", async () => {
    const ids = Array.from({ length: 123 }, (_, index) => String(index + 1));
    execute
      .mockResolvedValueOnce({ rows: ids.slice(0, 50).map((id) => ({ id })) })
      .mockResolvedValueOnce({ rows: ids.slice(50, 100).map((id) => ({ id })) })
      .mockResolvedValueOnce({ rows: ids.slice(100).map((id) => ({ id })) });
    expect(await readFaqKnowledgeSources(ids, transaction)).toHaveLength(123);
    expect(execute).toHaveBeenCalledTimes(3);
    for (const [statement] of execute.mock.calls) {
      const query = dialect.sqlToQuery(statement);
      expect(query.sql).toContain(
        "_status = 'published' AND review_status = 'approved'",
      );
      expect(query.sql).toContain("ORDER BY cms_faqs.id LIMIT 50 FOR SHARE");
      expect(query.sql).not.toMatch(/review_notes|SELECT \*|_cms_faqs_v/);
    }
    expect(dialect.sqlToQuery(execute.mock.calls[1][0]).params).toContain(50);
    expect(dialect.sqlToQuery(execute.mock.calls[2][0]).params).toContain(100);
  });

  it("reads only public rules/questions and accepts a retired exact-bound version", async () => {
    execute.mockResolvedValueOnce({
      rows: [{ id: chatbotId(20), versionNumber: 3 }],
    });
    await readEligibilityKnowledgeSources([chatbotId(20)], transaction);
    const queries = execute.mock.calls.map(([statement]) =>
      dialect.sqlToQuery(statement),
    );
    expect(queries[0].sql).toContain("status IN ('PUBLISHED', 'RETIRED')");
    expect(queries[1].sql).toContain(
      "execution_mode IN ('SELF_CHECK', 'BOTH')",
    );
    expect(queries[2].sql).toContain("'SELF_CHECK' = ANY(i.available_in)");
    expect(queries[2].sql).not.toContain("screening_source");
    expect(queries.every((query) => query.sql.includes("FOR SHARE"))).toBe(
      true,
    );
  });

  it("uses stable SQL search/cursors and a lookahead for staff selection", async () => {
    await listFaqKnowledgeSources({
      after: "50",
      search: "application",
      limit: 50,
    });
    const faq = dialect.sqlToQuery(execute.mock.calls[0][0]);
    expect(faq.params).toEqual([50, "%application%", 51]);
    await listFundingCallKnowledgeSources({
      after: chatbotId(10),
      search: "fund",
      limit: 50,
    });
    const call = dialect.sqlToQuery(execute.mock.calls[1][0]);
    expect(call.sql).toContain("ORDER BY c.id LIMIT");
    expect(call.params.at(-1)).toBe(51);
    expect(call.sql).not.toMatch(/SELECT \*|c\.title ILIKE/);
  });
});
