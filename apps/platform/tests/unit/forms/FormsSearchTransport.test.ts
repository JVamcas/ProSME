import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/client-http", () => ({
  requestJson: vi.fn(),
  requestData: vi.fn(),
}));

import { requestJson } from "@/lib/client-http";
import { clientFormsService } from "@/modules/forms/ClientFormsService";
import { formQueryKeys } from "@/modules/forms/FormHooks";

beforeEach(() => vi.clearAllMocks());

describe("form catalogue search transport", () => {
  it("encodes the term and retains paging parameters", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      data: [],
      page: {
        page: 2,
        pageSize: 25,
        total: 0,
        totalPages: 0,
        nextCursor: null,
      },
    });
    await clientFormsService.list({
      page: 2,
      pageSize: 25,
      search: "Review & 50%",
    });
    const url = new URL(
      String(vi.mocked(requestJson).mock.calls[0][0]),
      "http://localhost",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "2",
      pageSize: "25",
      search: "Review & 50%",
    });
  });

  it("uses separate cache entries for different searches while normalizing an empty search", () => {
    const paging = { page: 1, pageSize: 10 };
    expect(formQueryKeys.list({ ...paging, search: "Review" })).not.toEqual(
      formQueryKeys.list({ ...paging, search: "Approval" }),
    );
    expect(formQueryKeys.list({ ...paging, search: "" })).toEqual(
      formQueryKeys.list(paging),
    );
  });
});
