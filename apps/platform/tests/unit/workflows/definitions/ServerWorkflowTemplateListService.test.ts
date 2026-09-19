import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateRepository",
  () => ({
    listCurrentWorkflowTemplates: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { getWorkflowTemplates } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import { listCurrentWorkflowTemplates } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { actor } from "./WorkflowTemplateFixtures";

const reader = {
  ...actor,
  capabilities: new Set([permissionCodes.workflowDefinitionRead]),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("workflow template admin list service", () => {
  it("returns one current version per template ordered by template name", async () => {
    vi.mocked(listCurrentWorkflowTemplates).mockResolvedValue([
      {
        currentVersionId: "43333333-3333-4333-8333-333333333333",
        currentVersionNumber: 3,
        currentVersionRowVersion: 4,
        currentVersionStatus: "APPROVED",
        id: "41111111-1111-4111-8111-111111111111",
        metadata: {
          code: "ZEBRA",
          description: "Latest Zebra version",
          name: "Zebra template",
        },
        updatedAt: new Date("2026-09-19T08:00:00.000Z"),
      },
      {
        currentVersionId: "44444444-4444-4444-8444-444444444444",
        currentVersionNumber: 1,
        currentVersionRowVersion: 1,
        currentVersionStatus: "DRAFT",
        id: "42222222-2222-4222-8222-222222222222",
        metadata: {
          code: "ALPHA",
          description: "Alpha draft",
          name: "Alpha template",
        },
        updatedAt: new Date("2026-09-19T09:00:00.000Z"),
      },
    ]);

    await expect(getWorkflowTemplates(reader)).resolves.toEqual([
      expect.objectContaining({
        code: "ALPHA",
        currentVersion: expect.objectContaining({ number: 1, status: "DRAFT" }),
      }),
      expect.objectContaining({
        code: "ZEBRA",
        currentVersion: expect.objectContaining({
          number: 3,
          status: "APPROVED",
        }),
      }),
    ]);
  });

  it("denies list access without the read permission", async () => {
    await expect(
      getWorkflowTemplates({ ...reader, capabilities: new Set() }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(listCurrentWorkflowTemplates).not.toHaveBeenCalled();
  });
});
