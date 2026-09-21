import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { saveConditionGroup } from "@/modules/conditions/infrastructure/ConditionGroupRepository";
import {
  cloneEligibilityRuleSet,
  createNewEligibilityRuleSet,
  getEligibilityRuleSetVersion,
  publishEligibilityRuleSet,
  retireEligibilityRuleSet,
  updateEligibilityRuleSet,
} from "@/modules/eligibility/application/ServerEligibilityRuleSetService";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { evaluatePublishedEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityEvaluatorService";
import { testEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityTestService";

const enabled = process.env.RUN_P5_ELIGIBILITY_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actor: AuthenticatedUser = {
  capabilities: new Set(Object.values(permissionCodes)),
  createdAt: new Date(),
  displayName: "Eligibility ruleset administrator",
  email: `eligibility-rules-${randomUUID()}@example.test`,
  id: randomUUID(),
  identitySubject: `eligibility-rules-${randomUUID()}`,
  lastLoginAt: null,
  roleCodes: new Set(),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, $3, 'staff', 'active')`,
    [actor.id, actor.email, actor.displayName],
  );
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("eligibility ruleset storage", () => {
  it("persists versioned rule outcomes and protects published content", async () => {
    const group = await saveConditionGroup({
      children: [
        {
          id: randomUUID(),
          kind: "CONDITION",
          leftOperand: {
            key: "application.business.employee_count",
            kind: "FIELD",
          },
          operator: "GREATER_THAN" as never,
          rightOperand: { kind: "CONSTANT", value: 0 },
        },
      ],
      combinator: "AND",
      id: randomUUID(),
      kind: "GROUP",
    });
    const created = await createNewEligibilityRuleSet(actor, {
      code: `RULES_${randomUUID().replaceAll("-", "").toUpperCase()}`,
      description: "Reusable SME eligibility rules.",
      name: "SME eligibility",
    });
    expect(created.version).toMatchObject({
      status: "DRAFT",
      versionNumber: 1,
    });

    const draft = await updateEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      {
        conditionDefinitions: [],
        expectedRowVersion: created.version.rowVersion,
        rules: [
          {
            applicantMessage: "At least one employee is required.",
            condition: {
              conditionGroupId: group.id,
              conditionId: group.children[0].id,
              kind: "CONDITION",
            },
            executionMode: "BOTH",
            failureType: "HARD_FAIL",
            order: 1,
            reasonCode: "EMPLOYEE_REQUIRED",
          },
          {
            applicantMessage: "The application requires screening.",
            condition: { conditionGroupId: group.id, kind: "GROUP" },
            executionMode: "SCREENING",
            failureType: "SOFT_FAIL",
            order: 2,
            reasonCode: "MANUAL_SCREENING",
          },
          {
            applicantMessage: "Review the supplied employee count.",
            condition: { conditionGroupId: group.id, kind: "GROUP" },
            executionMode: "SELF_CHECK",
            failureType: "WARNING",
            order: 3,
            reasonCode: "EMPLOYEE_WARNING",
          },
        ],
      },
    );
    const draftTest = await testEligibilityRuleSet(
      actor,
      created.definition.id,
      {
        mode: "SELF_CHECK",
        values: {
          application: {
            annual_turnover: 100_000,
            business: {
              bank_account_active: true,
              employee_count: 0,
              operating_months: 12,
              ownership_percentage: 80,
              registered: true,
              statutory_good_standing: true,
            },
            requested_amount: 50_000,
          },
          fundingCall: { maximum_grant_amount: 200_000 },
        },
        versionId: draft.version.id,
      },
    );
    expect(draftTest).toMatchObject({
      authoritative: false,
      eligible: false,
      ruleSetVersionId: draft.version.id,
    });
    const published = await publishEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      { expectedRowVersion: draft.version.rowVersion },
    );
    expect(published.version.status).toBe("PUBLISHED");
    expect(published.rules).toMatchObject([
      {
        executionMode: "BOTH",
        failureType: "HARD_FAIL",
        reasonCode: "EMPLOYEE_REQUIRED",
      },
      {
        executionMode: "SCREENING",
        failureType: "SOFT_FAIL",
        reasonCode: "MANUAL_SCREENING",
      },
      {
        executionMode: "SELF_CHECK",
        failureType: "WARNING",
        reasonCode: "EMPLOYEE_WARNING",
      },
    ]);
    const evaluation = await evaluatePublishedEligibilityRuleSet(
      actor,
      published.version.id,
      "SELF_CHECK",
      {
        application: { business: { employee_count: 0 } },
        eligibility: {},
        fundingCall: {},
        stages: [],
      },
    );
    expect(evaluation).toMatchObject({
      eligible: false,
      reasonCodes: ["EMPLOYEE_REQUIRED", "EMPLOYEE_WARNING"],
      ruleSetVersionId: published.version.id,
      ruleSetVersionNumber: 1,
      softFailures: [],
    });

    await expect(updateEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      {
        conditionDefinitions: [],
        expectedRowVersion: published.version.rowVersion,
        rules: [],
      },
    )).rejects.toBeInstanceOf(ResourceConflictError);
    await expect(saveConditionGroup(group)).rejects.toThrow(
      "conditions referenced by published eligibility rules are immutable",
    );

    const retired = await retireEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      { expectedRowVersion: published.version.rowVersion },
    );
    expect(retired.version.status).toBe("RETIRED");
    await expect(testEligibilityRuleSet(
      actor,
      created.definition.id,
      {
        mode: "SCREENING",
        values: {
          application: {
            annual_turnover: 100_000,
            business: {
              bank_account_active: true,
              employee_count: 1,
              operating_months: 12,
              ownership_percentage: 80,
              registered: true,
              statutory_good_standing: true,
            },
            requested_amount: 50_000,
          },
          fundingCall: { maximum_grant_amount: 200_000 },
        },
        versionId: retired.version.id,
      },
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(getEligibilityRuleSetVersion(
      actor,
      retired.version.id,
    )).resolves.toMatchObject({
      rules: published.rules,
      version: { id: retired.version.id, status: "RETIRED" },
    });

    const cloned = await cloneEligibilityRuleSet(
      actor,
      created.definition.id,
      retired.version.id,
    );
    expect(cloned.version).toMatchObject({
      status: "DRAFT",
      versionNumber: 2,
    });
  });
});
