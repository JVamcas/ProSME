"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/shared/ui/Button";
import { formFieldSchema } from "../../api/FormSchemas";
import { FormSelectOptionDialog } from "./FormSelectOptionDialog";

type OptionRow = {
  id: string;
  index: number;
  key: string;
  label: string;
  order: number;
};

export function FormSelectOptionsTable() {
  const form = useFormContext<z.input<typeof formFieldSchema>>();
  const options = useFieldArray({ control: form.control, name: "options" });
  const values = useWatch({ control: form.control, name: "options" }) ?? [];
  const [dialog, setDialog] = useState<{ id?: string }>();
  const rows: OptionRow[] = options.fields.map((option, index) => ({
    id: option.id,
    index,
    key: values[index]?.key ?? option.key,
    label: values[index]?.label ?? option.label,
    order: index + 1,
  }));
  const editing = rows.find((row) => row.id === dialog?.id);

  function removeOption(index: number) {
    const remaining = (form.getValues("options") ?? []).filter(
      (_, position) => position !== index,
    );
    options.replace(
      remaining.map((option, position) => ({ ...option, order: position + 1 })),
    );
  }

  const columns: DataTableColumn<OptionRow>[] = [
    { accessorKey: "order", header: "Order", enableSorting: false },
    { accessorKey: "key", header: "Key", enableSorting: false },
    { accessorKey: "label", header: "Label", enableSorting: false },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu
          label={`Actions for option ${row.original.label}`}
          items={[
            {
              id: "edit",
              label: "Edit",
              onAction: () => setDialog({ id: row.original.id }),
            },
            {
              id: "remove",
              label: "Remove",
              destructive: true,
              onAction: () => removeOption(row.original.index),
            },
          ]}
        />
      ),
    },
  ];
  const error = form.formState.errors.options?.message;
  return (
    <fieldset className="min-w-0 space-y-3 rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 text-sm font-bold text-brand-navy">
        Select options
      </legend>
      <DataTable
        columns={columns}
        data={rows}
        emptyMessage="No options added."
        rowKey={(row) => row.id}
        viewportHeight={280}
        toolbar={{
          actions: (
            <GeneralButton
              disabled={rows.length >= 100}
              onClick={() => setDialog({})}
              type="button"
              variant="outline"
            >
              Add option
            </GeneralButton>
          ),
        }}
      />
      {typeof error === "string" ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {dialog ? (
        <FormSelectOptionDialog
          existingKeys={rows
            .filter((row) => row.id !== editing?.id)
            .map((row) => row.key)}
          key={editing?.id ?? "new-option"}
          onClose={() => setDialog(undefined)}
          onSave={(option) => {
            if (editing)
              options.update(editing.index, {
                ...option,
                order: editing.order,
              });
            else options.append({ ...option, order: rows.length + 1 });
            form.clearErrors("options");
          }}
          option={editing}
        />
      ) : null}
    </fieldset>
  );
}
