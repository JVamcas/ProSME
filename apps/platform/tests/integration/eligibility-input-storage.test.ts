import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration", () => ({
  resolveEligibilityRuleSetContexts: vi.fn(async () => [{
    formFields: [{
      key: "business.employee_count",
      label: "Employee count",
      type: "NUMBER",
    }],
    id: "95000000-0000-4000-8000-000000000001",
    title: "Test funding call",
  }]),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  RequestValidationError,
  ResourceConflictError,
} from "@/lib/resource-errors";
import { saveConditionGroup } from "@/modules/conditions/infrastructure/ConditionGroupRepository";
import {
  addEligibilityInput,
  editEligibilityInput,
  EligibilityInputDependencyError,
  getEligibilityInputs,
  removeEligibilityInput,
} from "@/modules/eligibility/application/ServerEligibilityInputService";
import {
  cloneEligibilityRuleSet,
  createNewEligibilityRuleSet,
  publishEligibilityRuleSet,
  updateEligibilityRuleSet,
} from "@/modules/eligibility/application/ServerEligibilityRuleSetService";

const enabled = process.env.RUN_P5_ELIGIBILITY_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actor: AuthenticatedUser = {
  capabilities: new Set(Object.values(permissionCodes)),
  createdAt: new Date(),
  displayName: "Eligibility input administrator",
  email: `eligibility-inputs-${randomUUID()}@example.test`,
  id: randomUUID(),
  identitySubject: `eligibility-inputs-${randomUUID()}`,
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

(enabled ? describe : describe.skip)("eligibility input storage", () => {
  it("persists mode bindings, reports dependencies and protects publication", async () => {
    const created = await createNewEligibilityRuleSet(actor, {
      code: `INPUTS_${randomUUID().replaceAll("-", "").toUpperCase()}`,
      description: "Dynamic input storage",
      name: "Dynamic input storage",
    });
    const added = await addEligibilityInput(
      actor,
      created.definition.id,
      created.version.id,
      {
        availableIn: ["SELF_CHECK", "SCREENING"],
        expectedRowVersion: created.version.rowVersion,
        groupKey: "business",
        groupLabel: "Business",
        label: "Employee count",
        order: 1,
        screening: {
          sourceDefinitionId: randomUUID(),
          sourceKey: "employee_count",
          sourceKind: "APPLICATION_FORM_FIELD",
          sourceVersionId: randomUUID(),
          valuePath: "value",
        },
        selfCheck: {
          answerType: "NUMBER",
          explanation: "Use the current employee count.",
          helpText: "Enter a whole number.",
          options: [],
          prompt: "How many people does the business employ?",
          required: true,
        },
        stableKey: "employee_count",
        type: "NUMBER",
      },
    );
    expect(added.inputs[0]).toMatchObject({
      screening: { sourceKind: "APPLICATION_FORM_FIELD" },
      selfCheck: { answerType: "NUMBER" },
      stableKey: "employee_count",
    });
    await expect(publishEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      { expectedRowVersion: added.version.rowVersion },
    )).rejects.toBeInstanceOf(RequestValidationError);
    const storedInput = added.inputs[0];
    if (!storedInput?.selfCheck) throw new Error("Input was not persisted.");
    const selfCheckOnly = await editEligibilityInput(
      actor,
      created.definition.id,
      created.version.id,
      storedInput.id,
      {
        availableIn: ["SELF_CHECK"],
        expectedRowVersion: added.version.rowVersion,
        groupKey: storedInput.groupKey,
        groupLabel: storedInput.groupLabel,
        label: storedInput.label,
        order: storedInput.order,
        screening: null,
        selfCheck: storedInput.selfCheck,
        stableKey: storedInput.stableKey,
        type: storedInput.type,
      },
    );
    expect(selfCheckOnly.inputs[0].screening).toBeNull();

    const dependencyGroup = await saveConditionGroup({
      children: [{
        id: randomUUID(),
        kind: "CONDITION",
        leftOperand: {
          key: "eligibility.employee_count",
          kind: "FIELD",
        },
        operator: "GREATER_THAN" as never,
        rightOperand: { kind: "CONSTANT", value: 0 },
      }],
      combinator: "AND",
      id: randomUUID(),
      kind: "GROUP",
    });
    const dependencyDraft = await updateEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      {
        conditionDefinitions: [],
        expectedRowVersion: selfCheckOnly.version.rowVersion,
        questionIds: [],
        rules: [{
          applicantMessage: "At least one employee is required.",
          condition: {
            conditionGroupId: dependencyGroup.id,
            conditionId: dependencyGroup.children[0].id,
            kind: "CONDITION",
          },
          executionMode: "BOTH",
          failureType: "HARD_FAIL",
          order: 1,
          reasonCode: "CONFIGURED_EMPLOYEE_REQUIRED",
        }],
      },
    );
    await expect(removeEligibilityInput(
      actor,
      created.definition.id,
      created.version.id,
      storedInput.id,
      dependencyDraft.version.rowVersion,
    )).rejects.toBeInstanceOf(EligibilityInputDependencyError);

    const dependencyCondition = dependencyGroup.children[0];
    if (dependencyCondition.kind !== "CONDITION") {
      throw new Error("Expected an eligibility condition.");
    }
    const publishableGroup = await saveConditionGroup({
      children: [{
        ...dependencyCondition,
        leftOperand: {
          key: "application.business.employee_count",
          kind: "FIELD",
        },
      }],
      combinator: dependencyGroup.combinator,
      id: dependencyGroup.id,
      kind: "GROUP",
    });
    const publishableDraft = await updateEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      {
        conditionDefinitions: [],
        expectedRowVersion: dependencyDraft.version.rowVersion,
        questionIds: [],
        rules: [{
          applicantMessage: "At least one employee is required.",
          condition: {
            conditionGroupId: publishableGroup.id,
            conditionId: publishableGroup.children[0].id,
            kind: "CONDITION",
          },
          executionMode: "BOTH",
          failureType: "HARD_FAIL",
          order: 1,
          reasonCode: "EMPLOYEE_REQUIRED",
        }],
      },
    );
    const published = await publishEligibilityRuleSet(
      actor,
      created.definition.id,
      created.version.id,
      { expectedRowVersion: publishableDraft.version.rowVersion },
    );
    await expect(editEligibilityInput(
      actor,
      created.definition.id,
      created.version.id,
      storedInput.id,
      {
        availableIn: ["SELF_CHECK"],
        expectedRowVersion: published.version.rowVersion,
        groupKey: storedInput.groupKey,
        groupLabel: storedInput.groupLabel,
        label: "Changed after publication",
        order: storedInput.order,
        screening: null,
        selfCheck: storedInput.selfCheck,
        stableKey: storedInput.stableKey,
        type: storedInput.type,
      },
    )).rejects.toBeInstanceOf(ResourceConflictError);

    const cloned = await cloneEligibilityRuleSet(
      actor,
      created.definition.id,
      published.version.id,
    );
    await expect(getEligibilityInputs(
      actor,
      created.definition.id,
      cloned.version.id,
    )).resolves.toMatchObject({
      inputs: [{ stableKey: "employee_count" }],
    });
  });
});
