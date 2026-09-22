import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  innerJoin: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  select: vi.fn(),
  where: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions, kind: "and" })),
  asc: vi.fn((column: unknown) => ({ column, kind: "asc" })),
  desc: vi.fn((column: unknown) => ({ column, kind: "desc" })),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, kind: "eq", value })),
  inArray: vi.fn((column: unknown, values: unknown[]) => ({
    column,
    kind: "inArray",
    values,
  })),
}));
vi.mock("@/db/client", () => ({
  getDatabase: () => ({ select: mocks.select }),
}));
vi.mock("@/db/schema", () => ({
  formFields: {},
  formVersions: {},
  roles: {},
  users: {},
  workflowDefinitionVersions: {
    definitionId: "version.definitionId",
    id: "version.id",
    status: "version.status",
    versionNumber: "version.versionNumber",
  },
  workflowDefinitions: {
    id: "definition.id",
    name: "definition.name",
  },
}));

import { inArray } from "drizzle-orm";
import {
  listBindableWorkflowVersions,
  workflowTemplateVersionIsBindable,
} from "@/modules/workflows/infrastructure/WorkflowRepository";

describe("workflow repository binding queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: mocks.innerJoin,
        where: mocks.where,
      })),
    });
    mocks.innerJoin.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ limit: mocks.limit, orderBy: mocks.orderBy });
  });

  it("lists draft and published versions with status in the projection", async () => {
    const records = [{ status: "DRAFT", versionId: "draft-version" }];
    mocks.orderBy.mockResolvedValue(records);

    await expect(listBindableWorkflowVersions()).resolves.toEqual(records);

    expect(mocks.select).toHaveBeenCalledWith(expect.objectContaining({
      status: "version.status",
    }));
    expect(inArray).toHaveBeenCalledWith(
      "version.status",
      ["DRAFT", "PUBLISHED"],
    );
  });

  it("accepts only an existing draft or published version", async () => {
    mocks.limit.mockResolvedValue([{ id: "draft-version" }]);

    await expect(workflowTemplateVersionIsBindable("draft-version"))
      .resolves.toBe(true);

    expect(inArray).toHaveBeenCalledWith(
      "version.status",
      ["DRAFT", "PUBLISHED"],
    );
  });
});
