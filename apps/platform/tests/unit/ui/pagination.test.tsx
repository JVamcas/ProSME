import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pagination } from "@/components/ui/pagination";

describe("shared pagination", () => {
  it("renders the current server-backed page range", () => {
    const markup = renderToStaticMarkup(
      <Pagination
        hasNextPage
        onNext={() => undefined}
        onPrevious={() => undefined}
        page={2}
        pageSize={10}
        total={24}
      />,
    );

    expect(markup).toContain('aria-label="Pagination"');
    expect(markup).toContain("Showing 11–20 of 24");
    expect(markup).toContain("Page 2 of 3");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
  });

  it("remains visible with disabled navigation for a single page", () => {
    const markup = renderToStaticMarkup(
      <Pagination
        hasNextPage={false}
        onNext={() => undefined}
        onPrevious={() => undefined}
        page={1}
        pageSize={10}
        total={4}
      />,
    );

    expect(markup).toContain("Showing 1–4 of 4");
    expect(markup).toContain("Page 1 of 1");
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
  });
});
