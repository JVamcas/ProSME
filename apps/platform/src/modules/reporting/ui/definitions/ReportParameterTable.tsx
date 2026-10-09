"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { ReportTemplateInput } from "../../api/ReportManagementSchemas";
import type { ReportParameterDefinition } from "../../domain/ReportParameters";
import { reportQueryLimits } from "../../domain/ReportQueryLimits";
import { ReportParameterDialog } from "./ReportParameterDialog";
import {
  reportParameterBindingLabels,
  reportParameterDefaultLabel,
} from "./ReportParameterPresentation";
import { DeleteButton, EditButton } from "@/components/ui/action-buttons";

export function ReportParameterTable({ disabled }: { disabled: boolean }) {
  const { control, setValue } = useFormContext<ReportTemplateInput>();
  const parameters = useFieldArray({ control, name: "definition.parameters" });
  const definitions = useWatch({ control, name: "definition.parameters" });
  const [editor, setEditor] = useState<{ index?: number } | null>(null);

  function removeParameter(index: number) {
    setValue(
      "definition.parameters",
      definitions
        .filter((_parameter, position) => position !== index)
        .map((parameter, position) => ({
          ...parameter,
          position: position + 1,
        })),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  const columns: DataTableColumn<ReportParameterDefinition>[] = [
    {
      accessorKey: "position",
      header: "SQL position",
      cell: ({ row }) => `$${row.original.position}`,
    },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "type", header: "Type" },
    {
      accessorKey: "binding",
      header: "Binding",
      cell: ({ row }) => reportParameterBindingLabels[row.original.binding],
    },
    {
      accessorKey: "nullable",
      header: "Allow no value",
      cell: ({ row }) => (row.original.nullable ? "Yes" : "No"),
    },
    {
      id: "default",
      header: "Default value",
      cell: ({ row }) => reportParameterDefaultLabel(row.original),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <EditButton
            disabled={disabled}
            aria-label={`Edit parameter ${row.original.name}`}
            onClick={() => setEditor({ index: row.index })}
          />
          <DeleteButton
            disabled={disabled}
            aria-label={`Remove parameter ${row.original.name}`}
            onClick={() => removeParameter(row.index)}
          />
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4" aria-label="Parameters">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Parameters</h2>
        <GeneralButton
          type="button"
          variant="primary"
          size="compact"
          disabled={
            disabled || definitions.length >= reportQueryLimits.parameters
          }
          onClick={() => setEditor({})}
        >
          Add parameter
        </GeneralButton>
      </div>
      <DataTable
        columns={columns.map((column) => ({ ...column, enableSorting: false }))}
        data={definitions}
        rowKey={(parameter) => String(parameter.position)}
        density="compact"
        viewportHeight={320}
        emptyMessage="No parameters. Add a parameter to define a SQL value."
      />
      {editor ? (
        <ReportParameterDialog
          parameters={definitions}
          editingIndex={editor.index}
          disabled={disabled}
          onClose={() => setEditor(null)}
          onSave={(parameter) => {
            if (editor.index === undefined) {
              parameters.append(parameter);
            } else {
              parameters.update(editor.index, parameter);
            }
          }}
        />
      ) : null}
    </section>
  );
}
