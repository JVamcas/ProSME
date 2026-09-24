import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { listWorkflowTemplatePage } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("workflow template page repository", () => {
  it("limits and offsets version rows in SQL and counts all active versions", async () => {
    const offset = vi.fn().mockResolvedValue([{ currentVersionNumber: 2 }]);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const rowsWhere = vi.fn().mockReturnValue({ orderBy });
    const countWhere = vi.fn().mockResolvedValue([{ total: 23 }]);
    const rowsJoin = vi.fn().mockReturnValue({ where: rowsWhere });
    const countJoin = vi.fn().mockReturnValue({ where: countWhere });
    const select = vi.fn()
      .mockReturnValueOnce({ from: () => ({ innerJoin: rowsJoin }) })
      .mockReturnValueOnce({ from: () => ({ innerJoin: countJoin }) });
    vi.mocked(getDatabase).mockReturnValue({ select } as never);

    const result = await listWorkflowTemplatePage(3, 10);

    expect(result).toEqual({
      items: [{ currentVersionNumber: 2 }],
      total: 23,
    });
    expect(limit).toHaveBeenCalledWith(10);
    expect(offset).toHaveBeenCalledWith(20);
    expect(rowsWhere).toHaveBeenCalledOnce();
    expect(countWhere).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
  });
});
