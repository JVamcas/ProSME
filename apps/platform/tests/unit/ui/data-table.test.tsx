import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";

type RecordRow = {
  id: string;
  name: string;
};

const columns: DataTableColumn<RecordRow>[] = [
  { accessorKey: "id", header: "Reference" },
  { accessorKey: "name", header: "Name" },
];

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

  it("renders table toolbar content and actions", () => {
    const markup = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={[]}
        toolbar={{
          title: "Workflow definitions",
          description: "Manage workflow versions.",
          actions: <button type="button">Create workflow</button>,
        }}
      />,
    );

    expect(markup).toContain("Workflow definitions");
    expect(markup).toContain("Manage workflow versions.");
    expect(markup).toContain("Create workflow");
  });
});
