import { describe, expect, it } from "vitest";
import {
  findWorkflowMatches,
  searchTargetKey,
  workflowSearchEntries,
} from "@/modules/workflows/domain/definitions/WorkflowSearch";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import type { FormSearchContent } from "@/modules/forms/domain/FormSearchContent";

const form: FormSearchContent = {
  versionId: "exact-draft",
  name: "Review form",
  description: "Verification instructions",
  sections: [
    {
      id: "scores",
      title: "Scoring",
      description: "Assessment",
      fields: [
        {
          key: "score",
          label: "Innovation score",
          helpText: "Assess technical merit",
          details: ["Repeatable item justification"],
          options: [],
        },
        {
          key: "verdict",
          label: "Decision",
          helpText: "",
          options: ["Needs supporting evidence"],
        },
      ],
    },
  ],
};
function graphWithForms() {
  const graph = structuredClone(referenceWorkflow);
  for (const stage of graph.stages.slice(0, 2)) {
    stage.tasks[0].formBinding = {
      formVersionId: form.versionId,
      contextFields: [],
    };
  }
  return graph;
}
describe("workflow text search", () => {
  it("searches case-insensitive literal text, trims whitespace, and ignores empty queries", () => {
    const entries = workflowSearchEntries(graphWithForms(), [form]);
    expect(
      findWorkflowMatches(entries, "  TECHNICAL merit  ").filter(
        (match) => match.tab === "forms",
      ),
    ).toHaveLength(2);
    expect(findWorkflowMatches(entries, " ")).toEqual([]);
    expect(findWorkflowMatches(entries, "[.*")).toEqual([]);
  });
  it("keeps shared form matches scoped to each stage and task", () => {
    const matches = findWorkflowMatches(
      workflowSearchEntries(graphWithForms(), [form]),
      "Innovation",
    );
    expect(matches).toHaveLength(2);
    expect(matches[0].stageKey).not.toBe(matches[1].stageKey);
    expect(matches[0]).toMatchObject({
      tab: "forms",
      itemKey: "score",
      matchText: "Innovation score",
    });
    expect(matches[0].path).toContain("Scoring");
  });
  it("indexes section descriptions, options, task descriptions, and only bound versions", () => {
    const graph = graphWithForms();
    graph.stages[0].tasks[0].description = "Review the feasibility report";
    const entries = workflowSearchEntries(graph, [
      form,
      { ...form, versionId: "unbound", name: "Unbound secret" },
    ]);
    expect(findWorkflowMatches(entries, "supporting evidence")).toHaveLength(2);
    expect(
      findWorkflowMatches(entries, "Repeatable item justification"),
    ).toHaveLength(2);
    expect(
      findWorkflowMatches(entries, "Assessment").some(
        (match) => match.itemKey === "scores",
      ),
    ).toBe(true);
    expect(findWorkflowMatches(entries, "feasibility report")[0].tab).toBe(
      "tasks",
    );
    expect(findWorkflowMatches(entries, "Unbound secret")).toEqual([]);
  });
  it("finds legacy checklists and scores on their owning task", () => {
    const graph = graphWithForms();
    const taskKey = graph.stages[0].tasks[0].stableKey;
    graph.stages[0].scoring = [
      {
        taskStableKey: taskKey,
        aggregation: "SUM",
        criteria: [
          {
            stableKey: "VIABILITY",
            criterion: "Viability",
            description: "Market readiness",
            weight: 1,
            scaleMinimum: 0,
            scaleMaximum: 10,
            mandatoryComment: false,
          },
        ],
      },
    ];
    const entries = workflowSearchEntries(graph, []);
    expect(findWorkflowMatches(entries, "Market readiness")[0]).toMatchObject({
      tab: "scoring",
      taskKey,
      itemKey: "VIABILITY",
    });
    expect(findWorkflowMatches(entries, "Namibian-owned")[0].tab).toBe(
      "checklists",
    );
    expect(searchTargetKey("scoring", "same", "a")).not.toBe(
      searchTargetKey("scoring", "same", "b"),
    );
  });
});
