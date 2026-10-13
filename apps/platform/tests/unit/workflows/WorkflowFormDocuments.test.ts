import { drizzle } from "drizzle-orm/pg-proxy";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  refreshFormDocumentRequirements,
  withFormDocumentRequirements,
} from "@/modules/workflows/infrastructure/WorkflowFormDocumentRepository";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

const policy = {
  stableKey: "REVIEW_EVIDENCE",
  acceptedFileTypes: ["PDF"],
  maximumSizeMb: 20,
  expiryDays: 30,
  requestOnStageActivation: true,
  uploader: "APPLICANT",
  verifier: "STAFF",
  templateReference: "Template",
};

describe("form-owned workflow document requirements", () => {
  it("projects current form policy in one bounded read and preserves other tasks", async () => {
    const graph = structuredClone(referenceWorkflow);
    const task = graph.stages[0].tasks[0];
    task.config = { workFormVersion: 1 };
    task.formBinding = {
      formVersionId: "20000000-0000-4000-8000-000000000001",
      contextFields: [],
    };
    const execute = vi.fn(async () => ({
      rows: [
        [
          task.formBinding!.formVersionId,
          "Review evidence",
          true,
          policy,
          "REVIEW_EVIDENCE",
          null,
          null,
          null,
          null,
        ],
      ],
    }));
    const result = await withFormDocumentRequirements(
      drizzle(execute) as never,
      graph,
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(
      result.stages[0].documentRequirements.filter(
        (item) => item.taskStableKey === task.stableKey,
      ),
    ).toEqual([
      {
        ...policy,
        name: "Review evidence",
        mandatory: true,
        taskStableKey: task.stableKey,
      },
    ]);
    expect(result.stages[1].documentRequirements).toEqual(
      graph.stages[1].documentRequirements,
    );
    expect(execute.mock.calls[0]).toBeDefined();
  });
  it("removes derived requirements when a form is unbound without querying forms", async () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages = [graph.stages[0]];
    for (const task of graph.stages[0].tasks) {
      task.config = { workFormVersion: 1 };
      task.formBinding = null;
    }
    const execute = vi.fn(async () => ({ rows: [] }));
    const result = await withFormDocumentRequirements(
      drizzle(execute) as never,
      graph,
    );
    expect(result.stages[0].documentRequirements).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });
});

it("materializes standard document settings without workflow evidence configuration", async () => {
  const graph = structuredClone(referenceWorkflow);
  const task = graph.stages[0].tasks[0];
  task.config = { workFormVersion: 1 };
  task.formBinding = { formVersionId: "form-version", contextFields: [] };
  const execute = vi.fn(async () => ({
    rows: [
      [
        "form-version",
        "Standard document",
        true,
        null,
        "STANDARD_DOCUMENT",
        "ANY",
        [".pdf"],
        4,
        3,
      ],
    ],
  }));
  const result = await withFormDocumentRequirements(
    drizzle(execute) as never,
    graph,
  );
  expect(
    result.stages[0].documentRequirements.find(
      (item) => item.stableKey === "STANDARD_DOCUMENT",
    ),
  ).toMatchObject({
    acceptedExtensions: [".pdf"],
    acceptedFileTypes: ["PDF"],
    maximumSizeMb: 4,
    maxPages: 3,
    uploader: "ANY",
    requestOnStageActivation: false,
    expiryDays: null,
  });
  expect(execute.mock.calls).toHaveLength(1);
});

it("refreshes draft requirements with bounded reads and the standard limits", async () => {
  const execute = vi.fn(async (query: string) => ({
    rows: query.startsWith("select")
      ? [
          [
            "form-version",
            "Standard document",
            true,
            null,
            "STANDARD_DOCUMENT",
            "ANY",
            [".pdf"],
            4,
            3,
            "stage-id",
            "task-id",
          ],
        ]
      : [],
  }));
  await refreshFormDocumentRequirements(
    drizzle(execute) as never,
    "workflow-version",
  );
  expect(execute).toHaveBeenCalledTimes(3);
  const calls = execute.mock.calls as unknown as [string, unknown[]][];
  expect(calls[0][0]).toContain(
    "DELETE FROM app_workflow_stage_document_requirements",
  );
  expect(calls[1][0]).toContain('"app_form_fields"."uploaded_by"');
  expect(calls[1][1]).toContain("workflow-version");
  expect(calls[2][0]).toContain('"max_pages"');
  expect(calls[2][0]).toContain('"accepted_extensions"');
  expect(calls[2][1]).toContain(3);
  expect(calls[2][1]).toContain("ANY");
  expect(calls[2][1]).toContain('[".pdf"]');
});
