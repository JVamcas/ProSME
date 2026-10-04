"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { RowData } from "@tanstack/react-table";
import { Check, Pencil, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton, IconButton } from "@/components/ui/button";
import { FieldError, Input, Select } from "./FormPrimitives";
import type {
  DataTableCellEdit,
  DataTableCellEditor,
} from "./DataTableEditing";

type Props<TData extends RowData> = {
  children: ReactNode;
  columnId: string;
  editor?: DataTableCellEditor<TData>;
  onCellEdit?: (edit: DataTableCellEdit<TData>) => Promise<void> | void;
  row: TData;
  rowId: string;
  value: unknown;
};

function CellEditForm<TData extends RowData>({
  columnId,
  editor,
  onCellEdit,
  onClose,
  row,
  rowId,
  value,
}: Omit<Props<TData>, "children" | "editor" | "onCellEdit"> & {
  editor: DataTableCellEditor<TData>;
  onCellEdit: NonNullable<Props<TData>["onCellEdit"]>;
  onClose: () => void;
}) {
  const errorId = useId();
  const saving = useRef(false);
  const form = useForm<{ value: string }, unknown, { value: unknown }>({
    resolver: zodResolver(z.object({ value: editor.schema })),
    defaultValues: {
      value: editor.formatInput?.(value, row) ?? String(value ?? ""),
    },
  });
  const { errors, isSubmitting } = form.formState;
  const error = errors.value?.message ?? errors.root?.message;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    return form.handleSubmit(async (values) => {
      if (saving.current) {
        return;
      }
      saving.current = true;
      form.clearErrors("root");
      try {
        if (!Object.is(values.value, value)) {
          await onCellEdit({
            row,
            rowId,
            columnId,
            previousValue: value,
            value: values.value,
          });
        }
        onClose();
      } catch (cause) {
        form.setError("root", {
          message:
            cause instanceof Error
              ? cause.message
              : "Unable to save this cell.",
        });
      } finally {
        saving.current = false;
      }
    })(event);
  };
  const fieldProps = {
    ...form.register("value"),
    "aria-label": editor.label,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    autoFocus: true,
    disabled: isSubmitting,
    className: "h-8 min-w-0 rounded-md px-2 text-sm",
  };

  return (
    <FormProvider {...form}>
      <form
        aria-label={`Edit ${editor.label}`}
        aria-busy={isSubmitting}
        className="min-w-40"
        noValidate
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving.current) {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <div className="flex items-center gap-1">
          {editor.options ? (
            <Select {...fieldProps}>
              {editor.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              {...fieldProps}
              type={editor.inputType ?? "text"}
              step="any"
            />
          )}
          <IconButton
            compact
            disabled={isSubmitting}
            label={`Save ${editor.label}`}
            type="submit"
            variant="ghost"
          >
            <Check className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            compact
            disabled={isSubmitting}
            label={`Cancel editing ${editor.label}`}
            onClick={onClose}
            variant="ghost"
          >
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
        <div role={error ? "alert" : undefined}>
          <FieldError id={errorId} message={error} />
        </div>
      </form>
    </FormProvider>
  );
}

export function DataTableEditableCell<TData extends RowData>(
  props: Props<TData>,
) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLDivElement>(null);
  const { children, editor, onCellEdit, row } = props;

  if (!editor || !onCellEdit || (editor.canEdit && !editor.canEdit(row))) {
    return children;
  }

  return (
    <div className="min-w-0">
      {editing ? (
        <CellEditForm
          {...props}
          editor={editor}
          onCellEdit={onCellEdit}
          onClose={() => {
            setEditing(false);
            requestAnimationFrame(() => {
              editButton.current?.querySelector("button")?.focus();
            });
          }}
        />
      ) : null}
      <div
        ref={editButton}
        className={editing ? "hidden" : "flex items-center gap-1"}
      >
        <div className="min-w-0 flex-1">{children}</div>
        <GeneralButton
          aria-label={`Edit ${editor.label}`}
          size="icon-compact"
          variant="ghost"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </GeneralButton>
      </div>
    </div>
  );
}
