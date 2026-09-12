import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  createDataTableColumnHelper,
  DataTable,
} from "@/components/ui/data-table";

type RecordRow = {
  id: string;
  name: string;
};

const helper = createDataTableColumnHelper<RecordRow>();
const columns = helper.columns([
  helper.accessor("id", { header: "Reference" }),
  helper.accessor("name", { header: "Name" }),
]);

describe("DataTable", () => {
  it("renders typed columns and rows", () => {
    const markup = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={[{ id: "APP-001", name: "Example Business" }]}
      />,
    );

    expect(markup).toContain("Reference");
    expect(markup).toContain("APP-001");
    expect(markup).toContain("Example Business");
  });

  it("renders the configured empty state", () => {
    const markup = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="No applications found"
      />,
    );

    expect(markup).toContain("No applications found");
  });
});
