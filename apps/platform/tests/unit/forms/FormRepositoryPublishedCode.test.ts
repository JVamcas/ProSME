import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { getLatestPublishedFormRuntimeByCode } from "@/modules/forms/infrastructure/FormRepository";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("published form lookup by code", () => {
  it("uses a bounded latest-version query and returns null when absent", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const innerJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ innerJoin }));
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDatabase).mockReturnValue({ select } as never);

    await expect(
      getLatestPublishedFormRuntimeByCode("COI_DECLARATION"),
    ).resolves.toBeNull();

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
    );
    expect(innerJoin).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
    expect(limit).toHaveBeenCalledWith(1);
  });
});
