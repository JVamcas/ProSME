import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));
vi.mock(
  "@/modules/forms/infrastructure/FormCascadePublicationRepository",
  () => ({
    publishAttachedFormVersions: vi.fn(),
  }),
);

import type { DatabaseTransaction } from "@/platform/database/client";
import type { WorkflowConditionFormField } from "@/modules/workflows/engine/WorkflowConditionFields";
import { findConfigurationReferences } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { validateWorkflowConfiguration } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { workflowPublicationPreparation } from "@/modules/workflows/application/definitions/ServerWorkflowCascadePublicationService";
import { validateWorkflowScoring } from "@/modules/workflows/engine/WorkflowScoringValidation";
import { actor, record } from "./WorkflowServiceFixtures";

const versionId = "scoring-form-version";
const score: WorkflowConditionFormField = {
  key: "quality",
  label: "Quality",
  type: "SCORE",
};
const aggregate: WorkflowConditionFormField = {
  key: "total",
  label: "Total score",
  type: "SCORING_AGGREGATE",
};

function graphWithScoring() {
  const graph = structuredClone(record.graph);
  graph.stages[0].tasks[0].config = { formPurpose: "APPLICATION_REVIEW" };
  graph.stages[0].tasks[0].formBinding = {
    formVersionId: versionId,
    contextFields: [],
  };
  return graph;
}

function references(fields: WorkflowConditionFormField[]) {
  return {
    formFields: new Map([[versionId, fields]]),
    forms: new Map([[versionId, "PUBLISHED"]]),
    formPurposes: new Map([[versionId, "APPLICATION_REVIEW" as const]]),
    roles: new Set<string>(),
    users: new Map([[actor.id, "active"]]),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("workflow scoring publication", () => {
  it("reports the stage and task when their scoring form has no aggregate", async () => {
    const graph = graphWithScoring();
    vi.mocked(findConfigurationReferences).mockResolvedValue(
      references([score]),
    );
    const validation = await validateWorkflowConfiguration(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContainEqual({
      code: "SCORING_AGGREGATE_REQUIRED",
      message: `${graph.stages[0].name} — ${graph.stages[0].tasks[0].name}: the scoring form needs a scoring aggregate with a configured calculation rule before publication.`,
      path: "stages.0.tasks.0.formBinding.formVersionId",
    });
  });

  it("blocks transactional publication using the real configuration validation", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue({
      ...record,
      graph: graphWithScoring(),
    });
    vi.mocked(findConfigurationReferences).mockResolvedValue(
      references([score]),
    );
    await expect(
      workflowPublicationPreparation(
        actor,
        record.version.id,
      )({} as DatabaseTransaction),
    ).rejects.toThrow("the scoring form needs a scoring aggregate");
  });

  it.each([
    ["a configured aggregate", [score, aggregate]],
    [
      "a form without scoring",
      [{ key: "comment", label: "Comment", type: "TEXTAREA" }],
    ],
  ] as const)("allows %s", (_name, fields) => {
    expect(
      validateWorkflowScoring(
        graphWithScoring(),
        new Map([[versionId, fields]]),
      ),
    ).toEqual([]);
  });

  it("does not borrow an aggregate from a different form version", () => {
    const fields = new Map([
      [versionId, [score]],
      ["different-version", [score, aggregate]],
    ]);
    expect(validateWorkflowScoring(graphWithScoring(), fields)).toHaveLength(1);
  });

  it("rejects multiple aggregates instead of guessing which review result to use", () => {
    const fields = new Map([
      [versionId, [score, aggregate, { ...aggregate, key: "SECOND_TOTAL" }]],
    ]);
    expect(validateWorkflowScoring(graphWithScoring(), fields)).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_SCORING_AGGREGATE" }),
    );
  });

  it("ignores stale form bindings on eligibility verification tasks", () => {
    const graph = graphWithScoring();
    graph.stages[0].tasks[0].config = {
      formPurpose: "ELIGIBILITY_VERIFICATION",
    };
    expect(
      validateWorkflowScoring(graph, new Map([[versionId, [score]]])),
    ).toEqual([]);
  });

  it("rejects legacy scoring without an aggregation rule", () => {
    const graph = graphWithScoring();
    graph.stages[0].scoring = [
      {
        taskStableKey: graph.stages[0].tasks[0].stableKey,
        aggregation: undefined as never,
        criteria: [
          {
            stableKey: "quality",
            criterion: "Quality",
            description: "",
            weight: 1,
            scaleMinimum: 0,
            scaleMaximum: 10,
            mandatoryComment: false,
          },
        ],
      },
    ];
    expect(validateWorkflowScoring(graph, new Map())).toContainEqual(
      expect.objectContaining({
        code: "SCORING_AGGREGATE_REQUIRED",
        path: "stages.0.scoring.0.aggregation",
      }),
    );
    graph.stages[0].scoring[0].aggregation = "AVERAGE";
    expect(validateWorkflowScoring(graph, new Map())).toEqual([]);
  });
});
