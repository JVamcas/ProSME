import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseTransaction } from "@/platform/database/client";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/forms/infrastructure/FormCascadePublicationRepository",
  () => ({ publishAttachedFormVersions: vi.fn() }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowSupport",
  () => ({ validateWorkflowConfiguration: vi.fn() }),
);
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { publishAttachedFormVersions } from "@/modules/forms/infrastructure/FormCascadePublicationRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { validateWorkflowConfiguration } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { workflowPublicationPreparation } from "@/modules/workflows/application/definitions/ServerWorkflowCascadePublicationService";
import { record, userWith } from "./WorkflowServiceFixtures";

const transaction = {} as DatabaseTransaction;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findWorkflowGraph).mockResolvedValue(record);
  vi.mocked(validateWorkflowConfiguration).mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
  });
});

describe("workflow cascade preparation", () => {
  it("collects application, COI and task forms and validates using the same transaction", async () => {
    const graph = structuredClone(record.graph);
    graph.stages[0].coiFormVersionId = "coi-version";
    graph.stages[0].tasks[0].formBinding = {
      formVersionId: "task-version",
      contextFields: [],
    };
    vi.mocked(findWorkflowGraph).mockResolvedValue({ ...record, graph });
    const actor = userWith(permissionCodes.workflowFormPublish);
    await workflowPublicationPreparation(actor, record.version.id, [
      "application-version",
    ])(transaction);
    expect(findWorkflowGraph).toHaveBeenCalledWith(
      record.version.id,
      transaction,
    );
    expect(publishAttachedFormVersions).toHaveBeenCalledWith(
      transaction,
      expect.arrayContaining([
        "application-version",
        "coi-version",
        "task-version",
      ]),
      actor.id,
      expect.any(Function),
    );
    expect(validateWorkflowConfiguration).toHaveBeenCalledWith(
      graph,
      false,
      transaction,
    );
    const authorize = vi.mocked(publishAttachedFormVersions).mock.calls[0][3];
    expect(() => authorize()).not.toThrow();
  });

  it("requires form publication permission when a draft needs publishing", async () => {
    vi.mocked(publishAttachedFormVersions).mockImplementationOnce(
      async (_tx, _ids, _actor, authorize) => {
        authorize();
      },
    );
    await expect(
      workflowPublicationPreparation(
        userWith(),
        record.version.id,
      )(transaction),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(validateWorkflowConfiguration).not.toHaveBeenCalled();
  });

  it("throws inside the caller's transaction if workflow validation fails", async () => {
    vi.mocked(validateWorkflowConfiguration).mockResolvedValue({
      valid: false,
      warnings: [],
      errors: [{ code: "INVALID", path: "stages", message: "Fix the route." }],
    });
    await expect(
      workflowPublicationPreparation(
        userWith(permissionCodes.workflowFormPublish),
        record.version.id,
      )(transaction),
    ).rejects.toThrow("Cannot publish workflow: Fix the route.");
  });

  it("rejects inactive workflows before any form publication", async () => {
    vi.mocked(findWorkflowGraph).mockResolvedValue({
      ...record,
      definition: { ...record.definition, active: false },
    });
    await expect(
      workflowPublicationPreparation(
        userWith(),
        record.version.id,
      )(transaction),
    ).rejects.toThrow("inactive");
    expect(publishAttachedFormVersions).not.toHaveBeenCalled();
  });
});
