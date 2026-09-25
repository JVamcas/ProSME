import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import type { AuthenticatedUser } from "@/auth/types";
import { createWorkflowTemplate } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { replaceWorkflowDraft } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

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
          entryCondition: {
            id: randomUUID(),
            kind: "GROUP" as const,
            combinator: "AND" as const,
            children: [
              {
                id: randomUUID(),
                kind: "CONDITION" as const,
                leftOperand: {
                  kind: "FIELD" as const,
                  key: "application.user_defined_eligibility_answer",
                },
                operator: basicOperators.EQUALS,
                rightOperand: {
                  kind: "CONSTANT" as const,
                  value: true,
                },
              },
            ],
          },
          exitCondition: {
            id: randomUUID(),
            kind: "GROUP" as const,
            combinator: "AND" as const,
            children: [
              {
                id: randomUUID(),
                kind: "CONDITION" as const,
                leftOperand: {
                  kind: "FIELD" as const,
                  key: "stage.technical_review.configured_review_result",
                },
                operator: basicOperators.EQUALS,
                rightOperand: {
                  kind: "CONSTANT" as const,
                  value: true,
                },
              },
            ],
          },
          actions: [],
          checklistItems: [
            {
              taskStableKey: "TECHNICAL_REVIEW_TASK",
              key: "OWNERSHIP_CONFIRMED",
              text: "Confirm that the ownership requirement is met.",
              mandatory: true,
              responseType: "YES_NO" as const,
              evidenceRequirement: "REQUIRED" as const,
              notes: "Review the current ownership records.",
              displayOrder: 1,
            },
            {
              taskStableKey: "TECHNICAL_REVIEW_TASK",
              key: "REVIEW_DATE",
              text: "Record the date of the ownership review.",
              mandatory: false,
              responseType: "DATE" as const,
              evidenceRequirement: "NONE" as const,
              notes: "",
              displayOrder: 2,
            },
          ],
          documentRequirements: [
            {
              taskStableKey: "TECHNICAL_REVIEW_TASK",
              name: "Tax clearance certificate",
              mandatory: true,
              acceptedFileTypes: ["PDF", "JPG"] as Array<"PDF" | "JPG">,
              maximumSizeMb: 10,
              expiryDays: 180,
              uploader: "APPLICANT" as const,
              verifier: "ASSIGNED_REVIEWER" as const,
              templateReference: "TAX_CLEARANCE_TEMPLATE",
            },
            {
              taskStableKey: "TECHNICAL_REVIEW_TASK",
              name: "Review memorandum",
              mandatory: false,
              acceptedFileTypes: ["PDF"] as Array<"PDF">,
              maximumSizeMb: 5,
              expiryDays: null,
              uploader: "STAFF" as const,
              verifier: "STAFF" as const,
              templateReference: "",
            },
          ],
          scoring: {
            aggregation: "WEIGHTED_AVERAGE" as const,
            taskStableKey: "REVIEW_TASK",
            criteria: [
              {
                criterion: "Business viability",
                description: "Assess the viability of the business.",
                weight: 60,
                scaleMinimum: 0,
                scaleMaximum: 10,
                mandatoryComment: true,
              },
              {
                criterion: "Economic impact",
                description: "Assess the expected economic impact.",
                weight: 40,
                scaleMinimum: 0,
                scaleMaximum: 10,
                mandatoryComment: false,
              },
            ],
          },
          tasks: [{
            actionKeys: [],
            assignmentMode: "NAMED_USER" as const,
            coiRequired: false,
            config: {},
            description: "Complete the technical review checklist.",
            displayOrder: 1,
            formBinding: null,
            name: "Technical review checklist",
            namedUserOverrideId: actor.id,
            permissions: defaultWorkflowElementPermissions,
            quorum: false,
            required: true,
            requiredCompletionCount: 1,
            reviewerCount: 1,
            roleId: null,
            stableKey: "TECHNICAL_REVIEW_TASK",
          }],
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
