import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageShell } from "@/shared/ui/PageShell";

describe("PageShell", () => {
  it("renders one consistent page heading with optional supporting content", () => {
    const markup = renderToStaticMarkup(
      <PageShell
        actions={<button type="button">Create</button>}
        description="Manage the records in this workspace."
        eyebrow="Administration"
        icon={<span aria-hidden="true">$</span>}
        title="Funding calls"
      >
        <div>Page content</div>
      </PageShell>,
    );

    expect(markup).toContain("<h1");
    expect(markup).toContain("Funding calls");
    expect(markup).toContain("Administration");
    expect(markup).toContain("Manage the records in this workspace.");
    expect(markup).toContain("Page content");
    expect(markup).toContain(">Create</button>");
  });

  it("supports the contained header treatment without changing the shell API", () => {
    const markup = renderToStaticMarkup(
      <PageShell title="Applications" variant="contained">
        <div>Applications table</div>
      </PageShell>,
    );

    expect(markup).toContain("rounded-2xl");
    expect(markup).toContain("Applications table");
  });
});
