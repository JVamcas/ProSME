import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  findConfigurationReferences: vi.fn(),
  listWorkflowAssignmentOptions: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));
import { validateWorkflowConfiguration } from "@/modules/workflows/application/definitions/ServerWorkflowSupport";
import { findConfigurationReferences } from "@/modules/workflows/infrastructure/WorkflowRepository";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import type { WorkflowActionNotification } from "@/modules/workflows/domain/actions/WorkflowActionNotification";

const recipientId = "10000000-0000-4000-8000-000000000001";
let references: Awaited<ReturnType<typeof findConfigurationReferences>>;
beforeEach(() => {
  references = {
    formFields: new Map(),
    formPurposes: new Map(),
    forms: new Map(),
    roles: new Set(),
    users: new Map(),
  };
  vi.mocked(findConfigurationReferences).mockResolvedValue(references);
});
function graph(recipientType: WorkflowActionNotification["recipientType"]) {
  const value = structuredClone(referenceWorkflow);
  value.stages[0].actions[0].notifications = [
    {
      id: recipientId,
      condition: null,
      recipientType,
      recipientId,
      subject: "Decision",
      body: "<p>Decision available</p>",
    },
  ];
  return value;
}

describe("action notification publication validation", () => {
  it.each(["SPECIFIC_USER", "SPECIFIC_ROLE"] as const)(
    "rejects an unavailable %s target",
    async (recipientType) => {
      const validation = await validateWorkflowConfiguration(
        graph(recipientType),
      );
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: "INVALID_NOTIFICATION_RECIPIENT",
          path: "stages.0.actions.0.notifications.0.recipientId",
        }),
      );
    },
  );
  it.each(["SPECIFIC_USER", "SPECIFIC_ROLE"] as const)(
    "accepts an available %s target",
    async (recipientType) => {
      references.users.set(recipientId, "active");
      references.roles.add(recipientId);
      const validation = await validateWorkflowConfiguration(
        graph(recipientType),
      );
      expect(
        validation.errors.some(
          (error) => error.code === "INVALID_NOTIFICATION_RECIPIENT",
        ),
      ).toBe(false);
    },
  );
  it("rejects invalid notification conditions using the shared workflow condition validator", async () => {
    const value = graph("APPLICATION_OWNER");
    value.stages[0].actions[0].notifications![0].condition = {
      id: recipientId,
      kind: "GROUP",
      combinator: "AND",
      children: [],
    };
    const validation = await validateWorkflowConfiguration(value);
    expect(validation.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_WORKFLOW_CONDITION",
        path: "stages.0.actions.0.notifications.0.condition",
      }),
    );
  });
});
