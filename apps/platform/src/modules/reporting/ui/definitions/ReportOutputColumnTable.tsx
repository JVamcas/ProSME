"use client";

import {
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldArrayWithId,
} from "react-hook-form";
import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { ReportTemplateInput } from "../../api/ReportManagementSchemas";
import { reportColumnTypeSchema } from "../../domain/ReportDataset";

type OutputColumnRow = FieldArrayWithId<
  ReportTemplateInput,
  "definition.columns"
>;

const columnTypeItems = reportColumnTypeSchema.options.map((value) => ({
  value,
  label: value,
}));

export function ReportOutputColumnTable({ disabled }: { disabled: boolean }) {
  const { control } = useFormContext<ReportTemplateInput>();
  const outputColumns = useFieldArray({ control, name: "definition.columns" });
  const values = useWatch({ control, name: "definition.columns" });
  const columns: DataTableColumn<OutputColumnRow>[] = [
    {
      accessorKey: "name",
      header: "Column name",
      enableSorting: false,
      cell: ({ row }) => (
        <FormInput
          label={`Column name ${row.index + 1}`}
          labelClassName="sr-only"
          name={`definition.columns.${row.index}.name`}
          size="compact"
          disabled={disabled}
        />
      ),
    },
    {
      accessorKey: "type",
      header: "Column type",
      enableSorting: false,
      cell: ({ row }) => (
        <FormSelect
          label={`Column type ${row.index + 1}`}
          labelClassName="sr-only"
          name={`definition.columns.${row.index}.type`}
          items={columnTypeItems}
          size="compact"
          disabled={disabled}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu
          label={`Actions for column ${values[row.index]?.name || row.index + 1}`}
          items={[
            {
              id: "remove",
              label: "Remove column",
              disabled,
              destructive: true,
              onAction: () => outputColumns.remove(row.index),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={outputColumns.fields}
      rowKey={(column) => column.id}
      density="compact"
      viewportHeight={320}
      emptyMessage="No output columns. Add columns in SQL order."
      toolbar={{
        title: "Output columns, in SQL order",
        actions: (
          <GeneralButton
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              outputColumns.append({ name: "columnName", type: "text" })
            }
          >
            Add column
          </GeneralButton>
        ),
      }}
    />
  );
}
