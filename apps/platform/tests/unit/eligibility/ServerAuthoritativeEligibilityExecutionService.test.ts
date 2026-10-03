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
import { PermissionDeniedError } from "@/auth/authorization/policy";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
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

describe("authoritative eligibility workflow execution", () => {
  it("runs an inherited verification form without a legacy explicit command", async () => {
    const values = { ENTITY_REGISTERED: "YES" };
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      config: { formPurpose: "ELIGIBILITY_VERIFICATION" },
      formVersionId: "90000000-0000-4000-8000-000000000001",
    });
    vi.mocked(saveEligibilityEvaluationForm).mockResolvedValue(values);

    await expect(
      executeAuthoritativeEligibility(actor, { ...input, values }),
    ).resolves.toMatchObject({ outcome: "ELIGIBLE" });
    expect(persistAuthoritativeEligibilityExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ evaluatedFormValues: values }),
    );
  });

  it("persists the verified outcome inside the workflow transaction", async () => {
    await expect(
      executeAuthoritativeEligibility(actor, input),
    ).resolves.toMatchObject({ outcome: "ELIGIBLE", rowVersion: 3 });
    expect(persistAuthoritativeEligibilityExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        commandKey: input.idempotencyKey,
        outcome: expect.objectContaining({
          evaluatedBy: actor.id,
          evaluationNumber: 1,
          ruleSetVersionId: versionId,
          workflowTaskId: taskId,
        }),
      }),
    );
  });

  it("evaluates the exact submitted answer snapshot on a combined task", async () => {
    const values = { ENTITY_REGISTERED: "YES" };
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      formVersionId: "90000000-0000-4000-8000-000000000001",
    });
    vi.mocked(saveEligibilityEvaluationForm).mockResolvedValue(values);

    await executeAuthoritativeEligibility(actor, {
      ...input,
      expectedResponseRowVersion: 3,
      values,
    });

    expect(saveEligibilityEvaluationForm).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        expectedResponseRowVersion: 3,
        values,
      }),
    );
    expect(persistAuthoritativeEligibilityExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ evaluatedFormValues: values }),
    );
  });

  it("blocks evaluation until required Screening tasks complete", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      prerequisiteNames: ["Completeness and document screening"],
    });

    await expect(
      executeAuthoritativeEligibility(actor, input),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "denies an actor without the configured process permission: confirmed=%s",
    async (confirmHardFailure) => {
      await expect(
        executeAuthoritativeEligibility(
          {
            ...actor,
            capabilities: new Set(),
          },
          { ...input, confirmHardFailure },
        ),
      ).rejects.toBeInstanceOf(PermissionDeniedError);
    },
  );

  it("hides a task assigned to a different actor", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      assignedToActor: false,
    });

    await expect(
      executeAuthoritativeEligibility(actor, input),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("blocks re-evaluation when the published task policy forbids it", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      config: {
        command: "AUTHORITATIVE_ELIGIBILITY",
        reevaluationPolicy: "NEVER",
      },
      previousOutcome: previousOutcome(),
    });

    await expect(
      executeAuthoritativeEligibility(actor, input),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(resolveAuthoritativeEligibilityData).not.toHaveBeenCalled();
    expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
  });

  it("requires changed resolved evidence before creating a new evaluation", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      previousOutcome: previousOutcome(),
      status: "COMPLETED",
    });

    await expect(
      executeAuthoritativeEligibility(actor, input),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
  });
});
