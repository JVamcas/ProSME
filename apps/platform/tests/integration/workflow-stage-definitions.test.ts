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
  email: `stage-${randomUUID()}@example.test`,
  displayName: "Stage administrator",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: `stage-${randomUUID()}`,
  roleCodes: new Set<string>(),
  capabilities: new Set(Object.values(permissionCodes)),
};

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Stage administrator', 'staff', 'active')`,
    [actor.id, actor.email],
  );
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("workflow stage definition storage", () => {
  it("round-trips configurable stages on a Draft version", async () => {
    const created = await createWorkflowTemplate(
      actor,
      {
        code: `STAGE_${randomUUID().replaceAll("-", "").toUpperCase()}`,
        name: "Stage definition template",
        description: "Phase 1.3 verification",
      },
      randomUUID(),
    );
    const graph = {
      stages: [
        {
          stableKey: "TECHNICAL_REVIEW",
          name: "Technical review",
          description: "Review technical merits.",
          enabled: true,
          optional: false,
          displayOrder: 1,
          publicStatusMapping: {
            status: "UNDER_REVIEW" as const,
            label: "Detailed review",
            description: "Your application is under detailed review.",
          },
          repeatable: true,
          coiGated: true,
          initial: true,
          slaHours: null,
          actions: [],
          tasks: [],
        },
      ],
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
    expect(stored?.transitions).toEqual([]);
    expect(stored?.stages).toHaveLength(1);
    expect(stored?.stages[0]).toMatchObject(graph.stages[0]);
    expect(stored?.stages[0].id).toEqual(expect.any(String));
  });
});
