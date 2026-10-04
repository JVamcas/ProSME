import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowEligibilityFailureService",
  () => ({
    terminateWorkflowOnEligibilityFailure: vi.fn(),
  }),
);
vi.mock(
  "@/modules/eligibility/application/SaveEligibilityEvaluationForm",
  () => ({ saveEligibilityEvaluationForm: vi.fn() }),
);
vi.mock(
  "@/modules/eligibility/infrastructure/AuthoritativeEligibilityExecutionRepository",
  () => ({
    findAuthoritativeEligibilityExecutionByCommand: vi.fn(),
    lockAuthoritativeEligibilityTask: vi.fn(),
    persistAuthoritativeEligibilityExecution: vi.fn(),
    withAuthoritativeEligibilityExecutionTransaction: vi.fn(),
  }),
);
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository",
  () => ({ findRuntimeEligibilityRuleSetForEvaluation: vi.fn() }),
);
vi.mock(
  "@/modules/eligibility/application/ServerEligibilityDataResolver",
  () => ({ resolveAuthoritativeEligibilityData: vi.fn() }),
);

import { terminateWorkflowOnEligibilityFailure } from "@/modules/workflows/application/runtime/ServerWorkflowEligibilityFailureService";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { executeAuthoritativeEligibility } from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";
import { resolveAuthoritativeEligibilityData } from "@/modules/eligibility/application/ServerEligibilityDataResolver";
import { saveEligibilityEvaluationForm } from "@/modules/eligibility/application/SaveEligibilityEvaluationForm";
import {
  findAuthoritativeEligibilityExecutionByCommand,
  lockAuthoritativeEligibilityTask,
  persistAuthoritativeEligibilityExecution,
  withAuthoritativeEligibilityExecutionTransaction,
} from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityExecutionRepository";
import { findRuntimeEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import {
  actor,
  input,
  target,
  previousOutcome,
  taskId,
  versionId,
} from "../../support/AuthoritativeEligibilityExecutionFixture";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(terminateWorkflowOnEligibilityFailure).mockResolvedValue(null);
  vi.mocked(
    withAuthoritativeEligibilityExecutionTransaction,
  ).mockImplementation(async (work) => work({} as never));
  vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue(target());
  vi.mocked(findAuthoritativeEligibilityExecutionByCommand).mockResolvedValue(
    null,
  );
  vi.mocked(findRuntimeEligibilityRuleSetForEvaluation).mockResolvedValue({
    ruleSetId: "a0000000-0000-4000-8000-000000000001",
    rules: [],
    versionId,
    versionNumber: 3,
  });
  vi.mocked(resolveAuthoritativeEligibilityData).mockResolvedValue({
    provenance: {},
    resolutions: [],
    values: {},
  });
  vi.mocked(persistAuthoritativeEligibilityExecution).mockResolvedValue({
    eligible: true,
    evaluationId: "b0000000-0000-4000-8000-000000000001",
    evaluationNumber: 1,
    hardFailureCount: 0,
    manualScreeningRequired: false,
    outcome: "ELIGIBLE",
    rowVersion: 3,
    softFailureCount: 0,
    warningCount: 0,
  });
});

describe("terminal eligibility execution receipts", () => {
  it("replays a completed rejection without locking the now-cancelled stage or rerunning screening", async () => {
    const receipt = {
      ...previousOutcome(),
      assignedUserId: actor.id,
      coiCleared: true,
      permissions: target().permissions,
      taskRowVersion: 4,
      terminalStatus: "INELIGIBLE",
    };
    vi.mocked(findAuthoritativeEligibilityExecutionByCommand).mockResolvedValue(
      receipt,
    );
    await expect(
      executeAuthoritativeEligibility(actor, input),
    ).resolves.toMatchObject({
      terminalStatus: "INELIGIBLE",
      rowVersion: 4,
    });
    expect(lockAuthoritativeEligibilityTask).not.toHaveBeenCalled();
    expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
    expect(terminateWorkflowOnEligibilityFailure).not.toHaveBeenCalled();
  });

  it("denies a receipt replay after process permission has been revoked", async () => {
    vi.mocked(findAuthoritativeEligibilityExecutionByCommand).mockResolvedValue(
      {
        ...previousOutcome(),
        assignedUserId: actor.id,
        coiCleared: true,
        permissions: target().permissions,
        taskRowVersion: 4,
        terminalStatus: "INELIGIBLE",
      },
    );
    await expect(
      executeAuthoritativeEligibility(
        { ...actor, capabilities: new Set() },
        input,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it.each([
    { assignedUserId: actor.id, coiCleared: false },
    {
      assignedUserId: "10000000-0000-4000-8000-000000000009",
      coiCleared: true,
    },
  ])(
    "rejects replay when assignment or COI context no longer permits access",
    async (context) => {
      vi.mocked(
        findAuthoritativeEligibilityExecutionByCommand,
      ).mockResolvedValue({
        ...previousOutcome(),
        ...context,
        permissions: target().permissions,
        taskRowVersion: 4,
        terminalStatus: "INELIGIBLE",
      });
      await expect(
        executeAuthoritativeEligibility(actor, input),
      ).rejects.toBeInstanceOf(ResourceNotFoundError);
    },
  );

  it.each([false, true])(
    "requires confirmation before committing hard failures: confirmed=%s",
    async (confirmed) => {
      const finding = {
        applicantMessage: "Registration required",
        failureType: "HARD_FAIL" as const,
        reasonCode: "NOT_REGISTERED",
        ruleId: "10000000-0000-4000-8000-000000000003",
      };
      vi.mocked(findRuntimeEligibilityRuleSetForEvaluation).mockResolvedValue({
        ruleSetId: versionId,
        versionId,
        versionNumber: 3,
        rules: [
          {
            id: finding.ruleId,
            order: 1,
            executionMode: "SCREENING",
            ...finding,
            condition: { kind: "GROUP", conditionGroupId: versionId },
            conditionDefinition: {
              id: versionId,
              kind: "CONDITION",
              operator: basicOperators.EQUALS,
              leftOperand: { kind: "CONSTANT", value: false },
              rightOperand: { kind: "CONSTANT", value: true },
            },
          },
        ],
      });
      vi.mocked(findAuthoritativeEligibilityExecutionByCommand)
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          ...previousOutcome(),
          eligible: false,
          finalOutcome: "INELIGIBLE",
          hardFailures: [finding],
          assignedUserId: actor.id,
          coiCleared: true,
          permissions: target().permissions,
          taskRowVersion: 3,
          terminalStatus: "INELIGIBLE",
        });
      vi.mocked(terminateWorkflowOnEligibilityFailure).mockResolvedValue(
        "INELIGIBLE",
      );
      if (!confirmed) {
        const values = { registered: false };
        vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
          ...target(),
          formVersionId: "90000000-0000-4000-8000-000000000001",
        });
        vi.mocked(saveEligibilityEvaluationForm).mockResolvedValue(values);
        await expect(
          executeAuthoritativeEligibility(actor, { ...input, values }),
        ).resolves.toEqual({
          confirmationRequired: true,
        });
        expect(saveEligibilityEvaluationForm).toHaveBeenCalled();
        expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
        expect(terminateWorkflowOnEligibilityFailure).not.toHaveBeenCalled();
        vi.mocked(
          findAuthoritativeEligibilityExecutionByCommand,
        ).mockResolvedValue(null);
        const transactionWork = vi.mocked(
          withAuthoritativeEligibilityExecutionTransaction,
        ).mock.calls[0][0];
        await expect(transactionWork({} as never)).rejects.toBeInstanceOf(
          Error,
        );
        return;
      }
      await expect(
        executeAuthoritativeEligibility(actor, {
          ...input,
          confirmHardFailure: true,
        }),
      ).resolves.toMatchObject({
        terminalStatus: "INELIGIBLE",
        outcome: "INELIGIBLE",
        hardFailureCount: 1,
      });
      expect(terminateWorkflowOnEligibilityFailure).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ hardFailures: [finding], taskId }),
      );
      expect(
        vi.mocked(persistAuthoritativeEligibilityExecution).mock
          .invocationCallOrder[0],
      ).toBeLessThan(
        vi.mocked(terminateWorkflowOnEligibilityFailure).mock
          .invocationCallOrder[0],
      );
    },
  );
});
