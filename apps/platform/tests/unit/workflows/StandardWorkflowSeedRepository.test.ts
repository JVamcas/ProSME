import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository", () => ({
  createWorkflowDefinition: vi.fn(),
}));

import { getDatabase } from "@/db/client";
import { insertMissingStandardWorkflowDraft } from "@/modules/workflows/infrastructure/StandardWorkflowSeedRepository";
import { createWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";

const existingDefinitionId = "31111111-1111-4111-8111-111111111111";

describe("standard workflow seed repository", () => {
  it("does not change an existing workflow draft or restore removed form bindings", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: existingDefinitionId }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    vi.mocked(getDatabase).mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDatabase>);

    const result = await insertMissingStandardWorkflowDraft({
      code: "SME_FUND_STANDARD",
      description: "Existing standard workflow",
      graph: { stages: [], transitions: [] },
      name: "Standard workflow",
    });

    expect(result).toMatchObject({
      bindingsAdded: 0,
      created: false,
      definitionId: existingDefinitionId,
    });
    expect(createWorkflowDefinition).not.toHaveBeenCalled();
    expect(getDatabase).toHaveBeenCalledTimes(1);
  });
});
