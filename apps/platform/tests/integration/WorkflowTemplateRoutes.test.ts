import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowTemplateService",
  () => ({
    createWorkflowTemplate: vi.fn(),
    getWorkflowTemplates: vi.fn(),
  }),
);

import * as route from "@/app/api/workflows/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createWorkflowTemplate,
  getWorkflowTemplates,
} from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import {
  actor,
  template,
  version,
} from "../unit/workflows/definitions/WorkflowTemplateFixtures";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
});

describe("workflow template routes", () => {
  it("returns the admin template list", async () => {
    vi.mocked(getWorkflowTemplates).mockResolvedValue({
      items: [
        {
          code: "TEST",
          currentVersion: {
            id: version.id,
            number: 1,
            rowVersion: 1,
            status: "DRAFT",
          },
          description: "",
          isLatest: true,
          id: template.id,
          name: "Test template",
          updatedAt: "2026-09-19T09:00:00.000Z",
        },
      ],
      page: 2,
      pageSize: 10,
      total: 11,
      totalPages: 2,
    });

    const response = await route.GET(
      new Request("http://localhost/api/workflows?page=2&pageSize=10"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getWorkflowTemplates).toHaveBeenCalledWith(actor, 2, 10);
    expect(body.data.items[0]).toMatchObject({
      id: template.id,
      currentVersion: { number: 1, status: "DRAFT" },
    });
  });

  it("rejects invalid pagination parameters", async () => {
    const response = await route.GET(
      new Request("http://localhost/api/workflows?page=0&pageSize=100"),
    );
    expect(response.status).toBe(400);
    expect(getWorkflowTemplates).not.toHaveBeenCalled();
  });

  it("creates a template from validated metadata", async () => {
    vi.mocked(createWorkflowTemplate).mockResolvedValue({ template, version });
    const response = await route.POST(
      new Request("http://localhost/api/workflows", {
        body: JSON.stringify({
          code: "TEST",
          description: "A reusable template",
          name: "Test template",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createWorkflowTemplate).toHaveBeenCalledWith(
      actor,
      {
        code: "TEST",
        description: "A reusable template",
        name: "Test template",
      },
      expect.any(String),
    );
    expect(body.data.currentVersion).toMatchObject({
      number: 1,
      status: "DRAFT",
    });
  });

  it("rejects invalid template metadata before calling the service", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/workflows", {
        body: JSON.stringify({ code: "invalid code", name: "T" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    expect(createWorkflowTemplate).not.toHaveBeenCalled();
  });
});
