import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pagination } from "@/components/ui/pagination";
import { formListSchema } from "@/modules/forms/api/FormSchemas";

describe("forms pagination", () => {
  it("applies safe request defaults and limits", () => {
    expect(formListSchema.parse({})).toEqual({ page: 1, pageSize: 10 });
    expect(formListSchema.safeParse({ page: 0, pageSize: 10 }).success)
      .toBe(false);
    expect(formListSchema.safeParse({ page: 1, pageSize: 101 }).success)
      .toBe(false);
  });

  it("renders the range, page count and page-size selector", () => {
    const markup = renderToStaticMarkup(
      <Pagination
        hasNextPage
        onNext={() => undefined}
        onPageSizeChange={() => undefined}
        onPrevious={() => undefined}
        page={2}
        pageSize={10}
        total={27}
      />,
    );

    expect(markup).toContain("Showing 11–20 of 27");
    expect(markup).toContain("Page 2 of 3");
    expect(markup).toContain("Rows");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
  });
});
