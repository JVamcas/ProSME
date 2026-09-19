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
  email: `action-${randomUUID()}@example.test`,
  displayName: "Action administrator",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: `action-${randomUUID()}`,
  roleCodes: new Set<string>(),
  capabilities: new Set(Object.values(permissionCodes)),
};

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Action administrator', 'staff', 'active')`,
    [actor.id, actor.email],
  );
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("workflow action definition storage", () => {
  it("round-trips configurable actions attached to a Draft stage", async () => {
    const created = await createWorkflowTemplate(
      actor,
      {
        code: `ACTION_${randomUUID().replaceAll("-", "").toUpperCase()}`,
        name: "Action definition template",
        description: "Phase 1.5 verification",
      },
      randomUUID(),
    );
    const actions = [
      {
        stableKey: "ADVANCE_REVIEW",
        label: "Advance review",
        actionType: "APPROVE_ADVANCE" as const,
        enabled: true,
        reasonCodeRequired: false,
        displayOrder: 1,
      },
      {
        stableKey: "REJECT_REVIEW",
        label: "Reject review",
        actionType: "REJECT" as const,
        enabled: true,
        reasonCodeRequired: true,
        displayOrder: 2,
      },
    ];
    await replaceWorkflowDraft({
      actorId: actor.id,
      correlationId: randomUUID(),
      versionId: created.version.id,
      expectedRowVersion: created.version.rowVersion,
      graph: {
        stages: [
          {
            stableKey: "ASSESSMENT",
            name: "Assessment",
            description: "Assess the application.",
            enabled: true,
            optional: false,
            displayOrder: 1,
            publicStatusMapping: {
              status: "UNDER_REVIEW",
              label: "Assessment",
              description: "Your application is being assessed.",
            },
            repeatable: false,
            coiGated: false,
            initial: true,
            slaHours: null,
            actions,
            tasks: [],
          },
        ],
        transitions: [],
      },
    });
    const stored = (await findWorkflowGraph(created.version.id))?.graph;
    expect(stored?.stages[0].actions).toHaveLength(2);
    expect(stored?.stages[0].actions[0]).toMatchObject(actions[0]);
    expect(stored?.stages[0].actions[1]).toMatchObject(actions[1]);
  });
});
