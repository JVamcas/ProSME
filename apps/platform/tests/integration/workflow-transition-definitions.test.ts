import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import type { AuthenticatedUser } from "@/auth/types";
import { createWorkflowTemplate } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { replaceWorkflowDraft } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actor: AuthenticatedUser = {
  id: randomUUID(),
  status: "active",
  email: `transition-${randomUUID()}@example.test`,
  displayName: "Transition administrator",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: `transition-${randomUUID()}`,
  roleCodes: new Set<string>(),
  capabilities: new Set(Object.values(permissionCodes)),
};

function stage(
  stableKey: string,
  name: string,
  displayOrder: number,
): WorkflowStageInput {
  return {
    stableKey,
    name,
    description: `${name} stage.`,
    enabled: true,
    optional: false,
    displayOrder,
    publicStatusMapping: {
      status: "UNDER_REVIEW",
      label: name,
      description: `The application is in ${name.toLowerCase()}.`,
    },
    repeatable: false,
    coiGated: false,
    entryCondition: null,
    exitCondition: null,
    initial: displayOrder === 1,
    slaHours: null,
    actions: [
      {
        stableKey: "ADVANCE",
        label: "Advance",
        actionType: "APPROVE_ADVANCE",
        configuration: {},
        enabled: true,
        reasonCodeRequired: false,
        displayOrder: 1,
      },
    ],
    checklistItems: [],
    documentRequirements: [],
    scoring: null,
    tasks: [],
  };
}

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Transition administrator', 'staff', 'active')`,
    [actor.id, actor.email],
  );
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("workflow transition storage", () => {
  it("round-trips multiple prioritized targets for a configured action", async () => {
    const created = await createWorkflowTemplate(
      actor,
      {
        code: `TRANSITION_${randomUUID().replaceAll("-", "").toUpperCase()}`,
        name: "Transition definition template",
        description: "Phase 1.8 verification",
      },
      randomUUID(),
    );
    const graph = {
      stages: [
        stage("SCREENING", "Screening", 1),
        stage("ASSESSMENT", "Assessment", 2),
        stage("COMMITTEE", "Committee", 3),
      ],
      transitions: [
        {
          sourceStageKey: "SCREENING",
          actionKey: "ADVANCE",
          targetStageKey: "ASSESSMENT",
          priority: 1,
          condition: {
            id: randomUUID(),
            kind: "GROUP" as const,
            combinator: "AND" as const,
            children: [
              {
                id: randomUUID(),
                kind: "CONDITION" as const,
                leftOperand: {
                  kind: "FIELD" as const,
                  key: "stage.screening.user_defined_outcome",
                },
                operator: basicOperators.EQUALS,
                rightOperand: {
                  kind: "CONSTANT" as const,
                  value: "ASSESSMENT",
                },
              },
            ],
          },
        },
        {
          sourceStageKey: "SCREENING",
          actionKey: "ADVANCE",
          targetStageKey: "COMMITTEE",
          priority: 2,
          condition: null,
        },
      ],
    };
    await replaceWorkflowDraft({
      actorId: actor.id,
      correlationId: randomUUID(),
      versionId: created.version.id,
      expectedRowVersion: created.version.rowVersion,
      graph,
    });
    const stored = (await findWorkflowGraph(created.version.id))?.graph;
    expect(stored?.transitions).toHaveLength(2);
    expect(stored?.transitions).toEqual(
      expect.arrayContaining(
        graph.transitions.map((transition) =>
          expect.objectContaining(transition),
        ),
      ),
    );
  });
});
