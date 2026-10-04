# DataTable cell editing

The existing TanStack DataTable now lives at
`apps/platform/src/shared/ui/DataTable.tsx`. Existing consumers import it directly
from that location. Sorting, row expansion, custom cell renderers, toolbars,
footers, empty states, and minimum table widths are retained.

Rows default to compact spacing. Use `density="default"` for the previous roomy
spacing. The table fills its container and scrolls horizontally when columns
need more width; the scroll region is keyboard focusable.

## Enable selected columns

Attach `editor` only to columns that should allow editing:

```tsx
const columns: DataTableColumn<BusinessRow>[] = [
  { accessorKey: "id", header: "Reference" },
  {
    accessorKey: "name",
    header: "Name",
    editor: {
      label: "Business name",
      schema: z.string().trim().min(1, "Business name is required"),
      canEdit: (row) => row.canUpdate,
    },
  },
];
```

Supply `rowKey={(row) => row.id}` and `onCellEdit` to enable editors. The row key
is mandatory when editing is enabled, so sorting cannot change which record is
saved. Without a save callback, the table remains read only.

`onCellEdit` receives `row`, `rowId`, `columnId`, `previousValue`, and the
validated `value`. Call the owning domain's TanStack Query mutation and await
`mutateAsync`. That hook owns cache updates or invalidation and supplies refreshed
`data` to the table. The DataTable does not change its input data or send HTTP
requests itself. Existing screens remain read only until they configure editors
and their save mutation.

The editor schema accepts a string and can transform the saved value. For
example, a numeric editor can use
`z.string().regex(/^\d+$/, "Enter a whole number").transform(Number)` with
`inputType: "number"`. Other input types are `text`, `email`, and `date`.
Provide `options: [{ label, value }]` to reuse the shared select input, or
`formatInput` when a persisted value needs conversion for display in the input.

Click the pencil to edit a cell. Save or Enter validates and saves; Cancel or
Escape discards the edit. Unchanged values do not trigger a save. Controls are
disabled while saving. Failed saves keep the entered value and display an error
so the user can retry. `canEdit` controls availability in the UI; the owning
backend service still enforces resource permissions.
