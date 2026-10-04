import { getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pg-proxy";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { getFormEditor } from "@/modules/forms/infrastructure/FormRepository";
import { formDefinitions, formVersions } from "@/modules/forms/infrastructure/form.schema";
import { readFundingCallDetail } from "@/modules/funding-calls/infrastructure/FundingCallDetailRepository";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { callId, stored } from "../../support/FundingCallServiceFixture";

const definitionId = "20000000-0000-4000-8000-000000000002";
const versionId = stored.formVersionId;
const latestId = "20000000-0000-4000-8000-000000000003";
const timestamp = new Date("2026-09-20T08:00:00Z");

function values(keys: string[], row: Record<string, unknown>) {
  return keys.map((key) => {
    const value = row[key] ?? null;
    return value instanceof Date ? value.toISOString() : value;
  });
}

beforeEach(() => vi.clearAllMocks());

describe("attached version repository reads", () => {
  it("projects version owners through the call's exact attachments in one SQL query", async () => {
    const execute = vi.fn(async () => ({
      rows: [[
        ...values(Object.keys(getTableColumns(fundingCalls)), stored),
        definitionId,
        "eligibility-definition",
        "workflow-definition",
      ]],
    }));
    vi.mocked(getDatabase).mockReturnValue(drizzle(execute) as never);
    const detail = await readFundingCallDetail(callId);
    expect(detail?.call.formVersionId).toBe(versionId);
    expect(detail?.formDefinitionId).toBe(definitionId);
    expect(detail?.eligibilityRuleSetId).toBe("eligibility-definition");
    expect(detail?.workflowDefinitionId).toBe("workflow-definition");
    expect(execute).toHaveBeenCalledOnce();
    const [query, parameters] = execute.mock.calls[0] as unknown as [string, unknown[]];
    expect(query).toContain('"app_form_versions"."id" = "app_funding_calls"."form_version_id"');
    expect(query).toContain('"app_eligibility_rule_set_versions"."id" = "app_funding_calls"."eligibility_rule_set_version_id"');
    expect(query).toContain('"app_workflow_definition_versions"."id" = "app_funding_calls"."workflow_template_version_id"');
    expect(parameters).toEqual([callId, 1]);
  });

  it.each([versionId, "50000000-0000-4000-8000-000000000001"])("scopes form version %s to its owning definition", async (requestedVersionId) => {
    const execute = vi.fn(async (query: string, parameters: unknown[]) => {
      if (query.includes('from "app_form_definitions"')) {
        return { rows: [values(Object.keys(getTableColumns(formDefinitions)), {
          id: definitionId,
          name: "Application form",
          createdAt: timestamp,
          updatedAt: timestamp,
        })] };
      }
      if (query.includes('from "app_form_versions"')) {
        const published = values(
          Object.keys(getTableColumns(formVersions)),
          {
            id: versionId,
            formDefinitionId: definitionId,
            status: "PUBLISHED",
            versionNumber: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        );
        if (parameters.length === 1) {
          const latest = values(Object.keys(getTableColumns(formVersions)), {
            id: latestId,
            formDefinitionId: definitionId,
            status: "DRAFT",
            versionNumber: 2,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          return { rows: [latest, published] };
        }
        return { rows: requestedVersionId === versionId ? [published] : [] };
      }
      return { rows: [] };
    });
    vi.mocked(getDatabase).mockReturnValue(drizzle(execute) as never);
    const editor = await getFormEditor(definitionId, requestedVersionId);
    expect(editor?.version.id ?? null).toBe(requestedVersionId === versionId ? versionId : null);
    const read = execute.mock.calls.find(([query, parameters]) =>
      query.includes('from "app_form_versions"') && parameters.length > 1
    )!;
    expect(read[0]).toContain('"app_form_versions"."form_definition_id" = $1');
    expect(read[0]).toContain('"app_form_versions"."id" = $2');
    expect(read[1]).toEqual([definitionId, requestedVersionId, 1]);
    expect(editor?.version.id).not.toBe(latestId);
    if (editor) {
      expect(editor.versions.map((version) => version.id)).toEqual([latestId, versionId]);
    }
  });
});
