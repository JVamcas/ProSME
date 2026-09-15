import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataTableFilter } from "@/components/ui/data-table-filter";

describe("data table filter", () => {
  it("renders expanded content and the complete action API", () => {
    const markup = renderToStaticMarkup(
      <DataTableFilter
        defaultExpanded
        description="Narrow the work queue"
        footerActions={<span>2 active filters</span>}
        headerActions={<span>Saved view</span>}
        onApply={() => undefined}
        onClear={() => undefined}
        title="Task filters"
      >
        <label>
          Search
          <input name="search" />
        </label>
      </DataTableFilter>,
    );
    expect(markup).toContain("Task filters");
    expect(markup).toContain("Narrow the work queue");
    expect(markup).toContain("Saved view");
    expect(markup).toContain("2 active filters");
    expect(markup).toContain("Apply filters");
    expect(markup).toContain("Clear filters");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('name="search"');
  });

  it("supports controlled collapsed and loading states", () => {
    const collapsed = renderToStaticMarkup(
      <DataTableFilter expanded={false} title="Filters">
        Hidden fields
      </DataTableFilter>,
    );
    expect(collapsed).toContain("Show filters");
    expect(collapsed).not.toContain("Hidden fields");

    const loading = renderToStaticMarkup(
      <DataTableFilter
        expanded
        isApplying
        onApply={() => undefined}
        title="Filters"
      >
        Fields
      </DataTableFilter>,
    );
    expect(loading).toContain("Applying…");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("disabled");
  });
});
