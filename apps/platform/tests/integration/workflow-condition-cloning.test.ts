import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { cloneWorkflowGraph } from "@/modules/workflows/domain/definitions/WorkflowGraphCloning";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import {
  changeWorkflowTemplateLifecycle,
  publishWorkflowVersion,
} from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import {
  cloneWorkflowVersion,
  createWorkflowDefinition,
} from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actorId = randomUUID();
const correlationId = randomUUID();

const entryCondition = {
  children: [{
    id: "database-clone-entry-condition",
    kind: "CONDITION" as const,
    leftOperand: {
      key: "application.user_defined_answer",
      kind: "FIELD" as const,
    },
    operator: basicOperators.EQUALS,
    rightOperand: { kind: "CONSTANT" as const, value: true },
  }],
  combinator: "AND" as const,
  id: "database-clone-entry-group",
  kind: "GROUP" as const,
};

const exitCondition = {
  children: [{
    id: "database-clone-exit-condition",
    kind: "CONDITION" as const,
    leftOperand: {
      key: "stage.review.USER_DEFINED_RESULT",
      kind: "FIELD" as const,
    },
    operator: basicOperators.EQUALS,
    rightOperand: { kind: "CONSTANT" as const, value: "COMPLETE" },
  }],
  combinator: "AND" as const,
  id: "database-clone-exit-group",
  kind: "GROUP" as const,
};

const transitionCondition = {
  children: [{
    id: "database-clone-transition-condition",
    kind: "CONDITION" as const,
    leftOperand: {
      key: "stage.review.USER_DEFINED_RESULT",
      kind: "FIELD" as const,
    },
    operator: basicOperators.NOT_EQUALS,
    rightOperand: { kind: "CONSTANT" as const, value: "BLOCKED" },
  }],
  combinator: "AND" as const,
  id: "database-clone-transition-group",
  kind: "GROUP" as const,
};

const graph: WorkflowGraphInput = {
  stages: [{
    actions: [],
    checklistItems: [{
      key: "OWNERSHIP_CONFIRMED",
      text: "Confirm ownership.",
      mandatory: true,
      responseType: "YES_NO",
      evidenceRequirement: "REQUIRED",
      notes: "Review current records.",
      displayOrder: 1,
    }],
    documentRequirements: [{
      name: "Review evidence",
      mandatory: true,
      acceptedFileTypes: ["PDF"],
      maximumSizeMb: 10,
      expiryDays: null,
      uploader: "APPLICANT",
      verifier: "ASSIGNED_REVIEWER",
      templateReference: "REVIEW_EVIDENCE_TEMPLATE",
    }],
    commentFields: [{
      key: "REVIEW_RECOMMENDATION",
      label: "Review recommendation",
      helpText: "Summarise the recommendation.",
      mandatory: true,
      visibility: "INTERNAL_ONLY",
      displayOrder: 1,
    }],
    scoring: {
      aggregation: "WEIGHTED_AVERAGE",
      criteria: [{
        criterion: "Business viability",
        description: "Assess viability.",
        weight: 100,
        scaleMinimum: 0,
        scaleMaximum: 10,
        threshold: 6,
        mandatoryComment: true,
      }],
    },
    coiGated: false,
    description: "Review the application",
    displayOrder: 1,
    enabled: true,
    entryCondition,
    exitCondition,
    initial: true,
    name: "Review",
    optional: false,
    publicStatusMapping: {
      description: "Application under review",
      label: "Under review",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    stableKey: "REVIEW",
    tasks: [],
  }],
  transitions: [{
    actionKey: "COMPLETE",
    condition: transitionCondition,
    priority: 1,
    sourceStageKey: "REVIEW",
    targetStageKey: null,
    terminalOutcome: "COMPLETED",
  }],
};

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Clone administrator', 'staff', 'active')`,
    [actorId, `clone-${randomUUID()}@example.test`],
  );
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("workflow condition cloning", () => {
  it("preserves stage and transition conditions in the cloned version", async () => {
    const sourceVersionId = await createWorkflowDefinition({
      actorId,
      code: `CLONE_${randomUUID().replaceAll("-", "").toUpperCase()}`,
      correlationId,
      description: "Condition clone verification",
      graph,
      name: "Condition clone verification",
    });
    await changeWorkflowTemplateLifecycle({
      actorId,
      correlationId,
      expectedRowVersion: 1,
      idempotencyKey: randomUUID(),
      versionId: sourceVersionId,
    }, "SUBMIT");
    await changeWorkflowTemplateLifecycle({
      actorId,
      correlationId,
      expectedRowVersion: 2,
      idempotencyKey: randomUUID(),
      versionId: sourceVersionId,
    }, "APPROVE");
    await publishWorkflowVersion({
      actorId,
      correlationId,
      expectedRowVersion: 3,
      idempotencyKey: randomUUID(),
      versionId: sourceVersionId,
    });
    const source = await findWorkflowGraph(sourceVersionId);
    const clonedVersionId = await cloneWorkflowVersion({
      actorId,
      correlationId,
      definitionId: source!.definition.id,
      graph: cloneWorkflowGraph(source!.graph),
      sourceVersionId,
    });
    const clone = await findWorkflowGraph(clonedVersionId);

    expect(clone?.graph.stages[0].entryCondition).toEqual(entryCondition);
    expect(clone?.graph.stages[0].exitCondition).toEqual(exitCondition);
    expect(clone?.graph.stages[0].checklistItems).toEqual([
      expect.objectContaining({
        key: "OWNERSHIP_CONFIRMED",
        evidenceRequirement: "REQUIRED",
      }),
    ]);
    expect(clone?.graph.stages[0].documentRequirements).toEqual([
      expect.objectContaining({
        name: "Review evidence",
        templateReference: "REVIEW_EVIDENCE_TEMPLATE",
      }),
    ]);
    expect(clone?.graph.stages[0].commentFields).toEqual([
      expect.objectContaining({
        key: "REVIEW_RECOMMENDATION",
        visibility: "INTERNAL_ONLY",
      }),
    ]);
    expect(clone?.graph.stages[0].scoring).toEqual({
      aggregation: "WEIGHTED_AVERAGE",
      criteria: [expect.objectContaining({
        criterion: "Business viability",
        mandatoryComment: true,
      })],
    });
    expect(clone?.graph.transitions[0].condition).toEqual(
      transitionCondition,
    );
  });
});
