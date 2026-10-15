import { getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pg-proxy";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/forms/infrastructure/FormDraftContentRepository", () => ({
  syncDraftContent: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormFieldWriteRepository", () => ({
  copyFormVersionChildren: vi.fn(),
}));

import { getDatabase } from "@/db/client";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import {
  cloneFormVersion,
  saveFormDraft,
} from "@/modules/forms/infrastructure/FormWriteRepository";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";

const versionId = "10000000-0000-4000-8000-000000000001";
const definitionId = "10000000-0000-4000-8000-000000000002";

function versionRow() {
  const values: Record<string, unknown> = {
    id: versionId,
    formDefinitionId: definitionId,
    versionNumber: 1,
    status: "PUBLISHED",
    displayMode: "SINGLE_PAGE",
    showCompleteness: false,
    submissionMode: "EXPLICIT",
    submitLabel: "Save",
    metadata: {},
    rowVersion: 1,
  };
  return Object.keys(getTableColumns(formVersions)).map((key) => values[key] ?? null);
}

beforeEach(() => vi.clearAllMocks());

describe("versioned form completeness persistence", () => {
  it("retains the stored setting in the runtime projection", async () => {
    const database = drizzle(async (query) => ({
      rows: query.includes('from "app_form_versions"') ? [versionRow()] : [],
    }));
    vi.mocked(getDatabase).mockReturnValue(database as never);
    const runtime = await getFormRuntime(versionId);
    expect(runtime).toMatchObject({ versionId, showCompleteness: false });
  });

  it.each([false, true, undefined])(
    "writes an explicit setting and preserves it when omitted: %s",
    async (showCompleteness) => {
      const execute = vi.fn(async (_query: string, _parameters: unknown[]) => ({ rows: [versionRow()] }));
      const database = drizzle(execute);
      vi.mocked(getDatabase).mockReturnValue({
        transaction: async (run: (transaction: typeof database) => unknown) => run(database),
      } as never);
      await saveFormDraft({
        actorId: definitionId,
        definitionId,
        versionId,
        expectedRowVersion: 1,
        fields: [],
        sections: [],
        submitLabel: "Save",
        showCompleteness,
      });
      const [query, parameters] = execute.mock.calls[0];
      expect(query).toContain('"status" =');
      expect(parameters).toContain("DRAFT");
      if (showCompleteness === undefined) {
        expect(query).not.toContain('"show_completeness" =');
      } else {
        expect(query).toContain('"show_completeness" =');
        expect(parameters).toContain(showCompleteness);
      }
    },
  );

  it("copies a published version's visibility into its new draft", async () => {
    const execute = vi.fn(async (query: string, _parameters: unknown[]) => {
      if (query.includes('from "app_form_definitions"')) return { rows: [[definitionId]] };
      if (query.includes("coalesce(max(")) return { rows: [[1]] };
      if (query.startsWith("select") && query.includes('"source_version_id" =')) {
        return { rows: [] };
      }
      return { rows: [versionRow()] };
    });
    const database = drizzle(execute);
    vi.mocked(getDatabase).mockReturnValue({
      transaction: async (run: (transaction: typeof database) => unknown) => run(database),
    } as never);
    await cloneFormVersion({ actorId: definitionId, definitionId, sourceVersionId: versionId });
    const insert = execute.mock.calls.find(([query]) => query.startsWith("insert"));
    expect(insert?.[0]).toContain('"show_completeness"');
    expect(insert?.[1]).toContain(false);
  });
});
