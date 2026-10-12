import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { EventPagination } from "@/modules/content/ui/public/EventPagination";

describe("public event pagination", () => {
  it("shows pagination for two events on a single page", () => {
    const html = renderToStaticMarkup(
      <EventPagination page={1} pageSize={3} search="" total={2} />,
    );

    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain("Showing 1–2 of 2");
    expect(html).toContain("Page 1 of 1");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
