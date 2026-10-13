"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListChecks } from "lucide-react";

import { GeneralButton } from "@/shared/ui/Button";
import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { cn } from "@/lib/utils";
import { formFieldIdentity } from "@/modules/forms/domain/FormFieldOrdering";
import type { FormField } from "@/modules/forms/FormTypes";

function fieldTypeLabel(type: FormField["type"]) {
  if (type === "CHECKBOX") return "Checkbox";
  if (type === "YES_NO") return "Yes/No";
  return type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function fieldColumnSpanClass(columnSpan: FormField["columnSpan"]) {
  if (columnSpan === 1) return "col-span-1";
  if (columnSpan === 2) return "col-span-1 @xl:col-span-2";
  return "col-span-1 @xl:col-span-2 @4xl:col-span-3";
}

export function SortableFormField({
  canEdit,
  field,
  onDelete,
  onEdit,
  onConfigureRules,
}: {
  canEdit: boolean;
  field: FormField;
  onDelete: (field: FormField) => void;
  onEdit: (field: FormField) => void;
  onConfigureRules: (field: FormField) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    data: { kind: "field", sectionId: field.sectionId },
    disabled: !canEdit,
    id: formFieldIdentity(field),
  });
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border border-brand-navy/10 bg-brand-white p-3",
        fieldColumnSpanClass(field.columnSpan),
      )}
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <GeneralButton
            aria-label={`Reorder ${field.label}`}
            className="mt-1 cursor-grab touch-none text-brand-navy/45 disabled:cursor-default"
            disabled={!canEdit}
            size="icon-compact"
            type="button"
            variant="ghost"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </GeneralButton>
          <span className="text-xs font-bold text-brand-orange">
            {field.order}
          </span>
          <p className="min-w-0 flex-1 font-medium text-brand-navy">
            {field.label}
            {field.required ? (
              <span aria-label="required" className="ml-1 text-brand-orange">
                *
              </span>
            ) : null}
          </p>
          <div className="flex shrink-0 gap-1">
            <GeneralButton
              aria-label={`Configure validation rules for ${field.label}`}
              disabled={!canEdit}
              onClick={() => onConfigureRules(field)}
              size="icon-compact"
              type="button"
              variant="ghost"
            >
              <ListChecks className="size-4" />
            </GeneralButton>
            <EditButton disabled={!canEdit} onClick={() => onEdit(field)} />
            <DeleteButton disabled={!canEdit} onClick={() => onDelete(field)} />
          </div>
        </div>
        <div className="mt-2 pl-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-brand-navy/55">
              {fieldTypeLabel(field.type)}
            </span>
            <code className="break-all text-xs text-brand-navy/55">
              {field.key}
            </code>
            <span className="text-xs text-brand-navy/55">
              Width {field.columnSpan} columns
            </span>
          </div>
          {field.helpText ? (
            <p className="mt-1 text-sm text-brand-navy/60">{field.helpText}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
