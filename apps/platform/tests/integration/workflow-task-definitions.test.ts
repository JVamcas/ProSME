import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import type { AuthenticatedUser } from "@/auth/types";
import { createWorkflowTemplate } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { replaceWorkflowDraft } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actor: AuthenticatedUser = {
  id: randomUUID(),
  status: "active",
  email: `task-${randomUUID()}@example.test`,
  displayName: "Task administrator",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: `task-${randomUUID()}`,
  roleCodes: new Set<string>(),
  capabilities: new Set(Object.values(permissionCodes)),
};
const roleId = randomUUID();
const formDefinitionId = randomUUID();
const formVersionId = randomUUID();

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Task administrator', 'staff', 'active')`,
    [actor.id, actor.email],
  );
  await pool.query(
    `INSERT INTO app_roles (id, code, name, description)
     VALUES ($1, $2, 'Task reviewers', 'Phase 1.4 test role')`,
    [roleId, `TASK_${randomUUID().replaceAll("-", "").toUpperCase()}`],
  );
  await pool.query(
    `INSERT INTO app_form_definitions
       (id, code, name, description, created_by)
     VALUES ($1, $2, 'Technical assessment', 'Task binding form', $3)`,
    [
      formDefinitionId,
      `FORM_${randomUUID().replaceAll("-", "").toUpperCase()}`,
      actor.id,
    ],
  );
  await pool.query(
    `INSERT INTO app_form_versions
       (id, form_definition_id, version_number, status, created_by)
     VALUES ($1, $2, 1, 'PUBLISHED', $3)`,
    [formVersionId, formDefinitionId, actor.id],
  );
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("workflow task definition storage", () => {
  it("round-trips multiple configurable tasks in one Draft stage", async () => {
    const created = await createWorkflowTemplate(
      actor,
      {
        code: `TASK_${randomUUID().replaceAll("-", "").toUpperCase()}`,
        name: "Task definition template",
        description: "Phase 1.4 verification",
      },
      randomUUID(),
    );
    const tasks = [
      {
        actionKeys: ["RECOMMEND"],
        stableKey: "TECHNICAL_REVIEW",
        name: "Technical review",
        description: "Complete the technical assessment.",
        roleId,
        namedUserOverrideId: null,
        assignmentMode: "ROLE" as const,
        reviewerCount: 3,
        requiredCompletionCount: 2,
        quorum: true,
        coiRequired: true,
        displayOrder: 1,
        type: "ASSESSMENT_FORM" as const,
        required: true,
        config: {},
        formBinding: {
          contextFields: [{
            key: "application.requested_amount",
            label: "Requested amount",
            type: "NUMBER" as const,
          }],
          formVersionId,
        },
      },
      {
        actionKeys: ["DECIDE"],
        stableKey: "CHAIR_REVIEW",
        name: "Chair review",
        description: "Complete the chairperson review.",
        roleId: null,
        namedUserOverrideId: actor.id,
        assignmentMode: "NAMED_USER" as const,
        reviewerCount: 1,
        requiredCompletionCount: 1,
        quorum: false,
        coiRequired: true,
        displayOrder: 2,
        type: "DECISION" as const,
        required: true,
        config: {},
        formBinding: null,
      },
    ];
    const graph = {
      stages: [{
        stableKey: "ASSESSMENT",
        name: "Assessment",
        description: "Assess the application.",
        enabled: true,
        optional: false,
        displayOrder: 1,
        publicStatusMapping: {
          status: "UNDER_REVIEW" as const,
          label: "Assessment",
          description: "Your application is being assessed.",
        },
        repeatable: false,
        coiGated: true,
        entryCondition: null,
        exitCondition: null,
        initial: true,
        slaHours: null,
        actions: [
          {
            actionType: "APPROVE_ADVANCE" as const,
            configuration: {},
            displayOrder: 1,
            enabled: true,
            label: "Recommend",
            reasonCodeRequired: false,
            stableKey: "RECOMMEND",
          },
          {
            actionType: "APPROVE_ADVANCE" as const,
            configuration: {},
            displayOrder: 2,
            enabled: true,
            label: "Decide",
            reasonCodeRequired: false,
            stableKey: "DECIDE",
          },
        ],
        tasks,
      }],
      transitions: [],
    };
    await replaceWorkflowDraft({
      actorId: actor.id,
      correlationId: randomUUID(),
      versionId: created.version.id,
      expectedRowVersion: created.version.rowVersion,
      graph,
    });
    const stored = (await findWorkflowGraph(created.version.id))?.graph;
    expect(stored?.stages[0].tasks).toHaveLength(2);
    expect(stored?.stages[0].tasks[0]).toMatchObject(tasks[0]);
    expect(stored?.stages[0].tasks[1]).toMatchObject(tasks[1]);
  });
});
