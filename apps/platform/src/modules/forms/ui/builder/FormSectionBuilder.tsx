"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formFieldIdentity,
  moveFormField,
} from "@/modules/forms/domain/FormFieldOrdering";
import {
  formSectionIdentity,
  moveFormSection,
} from "@/modules/forms/domain/FormSectionOrdering";
import type { FormField, FormSection } from "@/modules/forms/FormTypes";
import { SortableFormField } from "./SortableFormField";

function SectionFields({
  canEdit,
  columnSpan,
  fields,
  onAddField,
  onDeleteField,
  onEditField,
  sectionId,
}: {
  canEdit: boolean;
  columnSpan: FormSection["columnSpan"];
  fields: FormField[];
  onAddField: (sectionId: string) => void;
  onDeleteField: (field: FormField) => void;
  onEditField: (field: FormField) => void;
  sectionId: string;
}) {
  const { isOver, setNodeRef } = useDroppable({
    data: { kind: "section-drop", sectionId },
    disabled: !canEdit,
    id: `section-drop:${sectionId}`,
  });
  return (
    <div
      className={cn(
        "mt-4 flex flex-1 flex-col rounded-xl bg-brand-cream/40 p-3 transition-shadow",
        isOver && "ring-2 ring-brand-orange/60",
      )}
      ref={setNodeRef}
    >
      <SortableContext
        items={fields.map(formFieldIdentity)}
        strategy={rectSortingStrategy}
      >
        {fields.length ? (
          <ul
            className={cn(
              "grid grid-cols-1 gap-2",
              fieldGridClass(columnSpan),
            )}
          >
            {fields.map((field) => (
              <SortableFormField
                canEdit={canEdit}
                field={field}
                key={formFieldIdentity(field)}
                onDelete={onDeleteField}
                onEdit={onEditField}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-navy/55">
            No fields in this section.
          </p>
        )}
      </SortableContext>
      <div className="ml-auto">
        <GeneralButton
          className="mt-3"
          disabled={!canEdit}
          onClick={() => onAddField(sectionId)}
          size="compact"
          type="button"
          variant="outlineOrange"
        >
          <Plus className="size-4" />
          Add field
        </GeneralButton>
      </div>
    </div>
  );
}

function SortableSection({
  canEdit,
  fields,
  onAddField,
  onDelete,
  onDeleteField,
  onEdit,
  onEditField,
  section,
}: {
  canEdit: boolean;
  fields: FormField[];
  onAddField: (sectionId: string) => void;
  onDelete: (section: FormSection) => void;
  onDeleteField: (field: FormField) => void;
  onEdit: (section: FormSection) => void;
  onEditField: (field: FormField) => void;
  section: FormSection;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    data: { kind: "section", sectionId: section.id },
    disabled: !canEdit,
    id: formSectionIdentity(section),
  });
  return (
    <li
      className={cn(
        "@container flex h-full flex-col rounded-xl border border-brand-navy/10 bg-brand-white p-4",
        sectionColumnSpanClass(section.columnSpan),
      )}
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label={`Reorder ${section.title}`}
          className="mt-1 cursor-grab touch-none text-brand-navy/45 disabled:cursor-default"
          disabled={!canEdit}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xs font-bold text-brand-orange">
              {section.order}
            </span>
            <h3 className="font-semibold text-brand-navy">{section.title}</h3>
            <code className="text-xs text-brand-navy/55">{section.key}</code>
          </div>
          {section.description ? (
            <p className="mt-1 text-sm text-brand-navy/65">
              {section.description}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1">
          <EditButton disabled={!canEdit} onClick={() => onEdit(section)} />
          <DeleteButton disabled={!canEdit} onClick={() => onDelete(section)} />
        </div>
      </div>
      {section.id ? (
        <SectionFields
          canEdit={canEdit}
          columnSpan={section.columnSpan}
          fields={fields}
          onAddField={onAddField}
          onDeleteField={onDeleteField}
          onEditField={onEditField}
          sectionId={section.id}
        />
      ) : null}
    </li>
  );
}

function targetSectionId(
  event: DragEndEvent,
  sections: FormSection[],
  fields: FormField[],
) {
  const overId = String(event.over?.id ?? "");
  const overField = fields.find((field) => formFieldIdentity(field) === overId);
  if (overField) return overField.sectionId;
  const dropPrefix = "section-drop:";
  if (overId.startsWith(dropPrefix)) return overId.slice(dropPrefix.length);
  return sections.find((section) => formSectionIdentity(section) === overId)
    ?.id;
}

function sectionColumnSpanClass(columnSpan: FormSection["columnSpan"]) {
  if (columnSpan === 1) return "col-span-1";
  if (columnSpan === 2) return "col-span-1 lg:col-span-2 2xl:col-span-2";
  return "col-span-1 lg:col-span-2 2xl:col-span-3";
}

function fieldGridClass(columnSpan: FormSection["columnSpan"]) {
  if (columnSpan === 1) return "grid-cols-1";
  if (columnSpan === 2) return "@xl:grid-cols-2";
  return "@xl:grid-cols-2 @4xl:grid-cols-3";
}

export function FormSectionBuilder({
  canEdit,
  fields,
  onAddField,
  onAddSection,
  onDelete,
  onDeleteField,
  onEdit,
  onEditField,
  onReorder,
  onReorderFields,
  sections,
}: {
  canEdit: boolean;
  fields: FormField[];
  onAddField: (sectionId: string) => void;
  onAddSection: () => void;
  onDelete: (section: FormSection) => void;
  onDeleteField: (field: FormField) => void;
  onEdit: (section: FormSection) => void;
  onEditField: (field: FormField) => void;
  onReorder: (sections: FormSection[]) => void;
  onReorderFields: (fields: FormField[]) => void;
  sections: FormSection[];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function dragEnded(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    if (event.active.data.current?.kind === "section") {
      const overSectionId = event.over.data.current?.sectionId as
        string | undefined;
      const overSection = sections.find(
        (section) => section.id === overSectionId,
      );
      const targetId = overSection
        ? formSectionIdentity(overSection)
        : String(event.over.id);
      onReorder(moveFormSection(sections, String(event.active.id), targetId));
      return;
    }
    const sectionId = targetSectionId(event, sections, fields);
    if (!sectionId) return;
    const overId =
      event.over.data.current?.kind === "field"
        ? String(event.over.id)
        : undefined;
    onReorderFields(
      moveFormField(fields, String(event.active.id), sectionId, overId),
    );
  }
  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-brand-cream/35 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-brand-navy">Form builder</h2>
          <p className="text-sm text-brand-navy/65">
            Drag sections or fields to change their order. Fields can move
            between sections.
          </p>
        </div>
        <GeneralButton disabled={!canEdit} onClick={onAddSection} type="button" size={"compact"}>
          <Plus className="size-4" />
          Add section
        </GeneralButton>
      </div>
      {sections.length ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={dragEnded}
          sensors={sensors}
        >
          <SortableContext
            items={sections.map(formSectionIdentity)}
            strategy={rectSortingStrategy}
          >
            <ul className="mt-4 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {sections.map((section) => (
                <SortableSection
                  canEdit={canEdit}
                  fields={fields
                    .filter((field) => field.sectionId === section.id)
                    .sort((left, right) => left.order - right.order)}
                  key={formSectionIdentity(section)}
                  onAddField={onAddField}
                  onDelete={onDelete}
                  onDeleteField={onDeleteField}
                  onEdit={onEdit}
                  onEditField={onEditField}
                  section={section}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="mt-4 text-sm text-brand-navy/55">
          Add a section before adding fields.
        </p>
      )}
    </section>
  );
}
