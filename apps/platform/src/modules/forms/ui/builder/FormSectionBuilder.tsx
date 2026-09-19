"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import type { FormSection } from "@/modules/forms/FormTypes";
import {
  formSectionIdentity,
  moveFormSection,
} from "@/modules/forms/domain/FormSectionOrdering";

function SortableSection({
  canEdit,
  onDelete,
  onEdit,
  section,
}: {
  canEdit: boolean;
  onDelete: (section: FormSection) => void;
  onEdit: (section: FormSection) => void;
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
    disabled: !canEdit,
    id: formSectionIdentity(section),
  });
  return (
    <li
      className="flex items-start gap-3 rounded-xl border border-brand-navy/10 bg-brand-white p-4"
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
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
    </li>
  );
}

export function FormSectionBuilder({
  canEdit,
  onDelete,
  onEdit,
  onReorder,
  sections,
}: {
  canEdit: boolean;
  onDelete: (section: FormSection) => void;
  onEdit: (section: FormSection) => void;
  onReorder: (sections: FormSection[]) => void;
  sections: FormSection[];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function dragEnded(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    onReorder(
      moveFormSection(
        sections,
        String(event.active.id),
        String(event.over.id),
      ),
    );
  }
  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-brand-cream/35 p-5">
      <div>
        <h2 className="font-bold text-brand-navy">Sections</h2>
        <p className="text-sm text-brand-navy/65">
          Sections are rendered in this order. Drag a section to reorder it.
        </p>
      </div>
      {sections.length ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={dragEnded}
          sensors={sensors}
        >
          <SortableContext
            items={sections.map(formSectionIdentity)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="mt-4 space-y-3">
              {sections.map((section) => (
                <SortableSection
                  canEdit={canEdit}
                  key={formSectionIdentity(section)}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  section={section}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="mt-4 text-sm text-brand-navy/55">
          No sections have been added.
        </p>
      )}
    </section>
  );
}
