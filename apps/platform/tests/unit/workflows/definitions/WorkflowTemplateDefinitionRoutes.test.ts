import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowTemplateDefinitionService",
  () => ({
    editWorkflowTemplateDefinition: vi.fn(),
    copyWorkflowTemplate: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowTemplateService",
  () => ({ getWorkflowTemplateVersionPage: vi.fn() }),
);
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  editWorkflowTemplateDefinition,
  copyWorkflowTemplate,
} from "@/modules/workflows/application/definitions/ServerWorkflowTemplateDefinitionService";
import { getWorkflowTemplateVersionPage } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import { PATCH } from "@/app/api/workflows/[id]/definition/route";
import { POST } from "@/app/api/workflows/[id]/templates/route";
import { GET } from "@/app/api/workflows/[id]/versions/route";
import {
  actor,
  templateId,
  versionId,
  metadata,
} from "./WorkflowTemplateFixtures";
const context = { params: Promise.resolve({ id: templateId }) };
const request = (method: string, input: unknown) =>
  new Request("http://localhost/api/workflows", {
    method,
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
});

describe("template definition and version routes", () => {
  it("sends parent edits to the definition command without a version ID", async () => {
    const input = {
      ...metadata,
      expectedUpdatedAt: "2026-10-10T10:00:00.000Z",
    };
    const response = await PATCH(request("PATCH", input), context);
    expect(response.status).toBe(200);
    expect(editWorkflowTemplateDefinition).toHaveBeenCalledWith(
      actor,
      templateId,
      input,
      expect.any(String),
    );
  });

  it("requires exact source selection and fresh template details for copies", async () => {
    const input = {
      ...metadata,
      code: "NEW_TEMPLATE",
      sourceVersionId: versionId,
    };
    expect((await POST(request("POST", input), context)).status).toBe(200);
    expect(copyWorkflowTemplate).toHaveBeenCalledWith(
      actor,
      templateId,
      input,
      expect.any(String),
    );
  });

  it.each([
    { operation: PATCH, input: { ...metadata, expectedUpdatedAt: "invalid" } },
    {
      operation: PATCH,
      input: {
        ...metadata,
        expectedUpdatedAt: "2026-10-10T10:00:00.000Z",
        versionId,
      },
    },
    { operation: POST, input: { ...metadata } },
    { operation: POST, input: { ...metadata, sourceVersionId: "invalid" } },
  ])(
    "rejects invalid or ambiguous write input",
    async ({ operation, input }) => {
      expect(
        (
          await operation(
            request(operation === PATCH ? "PATCH" : "POST", input),
            context,
          )
        ).status,
      ).toBe(400);
      expect(editWorkflowTemplateDefinition).not.toHaveBeenCalled();
      expect(copyWorkflowTemplate).not.toHaveBeenCalled();
    },
  );

  it("loads a bounded version page scoped to its parent", async () => {
    const response = await GET(
      new Request("http://localhost/api/workflows/versions?page=2&pageSize=5"),
      context,
    );
    expect(response.status).toBe(200);
    expect(getWorkflowTemplateVersionPage).toHaveBeenCalledWith(
      actor,
      templateId,
      2,
      5,
    );
  });

  it("rejects invalid version pagination before invoking the read service", async () => {
    expect(
      (
        await GET(
          new Request("http://localhost/api/workflows/versions?pageSize=100"),
          context,
        )
      ).status,
    ).toBe(400);
    expect(getWorkflowTemplateVersionPage).not.toHaveBeenCalled();
  });

  it("translates a server authorization denial", async () => {
    vi.mocked(copyWorkflowTemplate).mockRejectedValue(
      new PermissionDeniedError(permissionCodes.workflowDefinitionCreate),
    );
    expect(
      (
        await POST(
          request("POST", { ...metadata, sourceVersionId: versionId }),
          context,
        )
      ).status,
    ).toBe(403);
  });
});
