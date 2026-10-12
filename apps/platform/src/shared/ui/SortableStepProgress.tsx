"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GeneralButton } from "./Button";
import { GripVertical } from "lucide-react";
import {
  StepProgress,
  type StepProgressContainerProps,
  type StepProgressProps,
} from "./StepProgress";

function SortableStep({ children, className, id }: StepProgressContainerProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  return (
    <li
      className={`${className} flex-col items-center`}
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.5 : undefined,
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {children}
      <GeneralButton
        {...attributes}
        {...listeners}
        aria-label={`Move ${id} step`}
        className="relative z-10 mt-2 touch-none rounded p-1 text-brand-navy/60 hover:text-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        disabled={Boolean(attributes["aria-disabled"])}
        size="icon-compact"
        variant="ghost"
        ref={setActivatorNodeRef}
        type="button"
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </GeneralButton>
    </li>
  );
}

export function SortableStepProgress<TId extends string>({
  onOrderChange,
  ...props
}: StepProgressProps<TId> & {
  onOrderChange: (ids: TId[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = props.steps.map((step) => step.id);
  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id || props.disabled) return;
        const from = ids.findIndex((id) => id === active.id);
        const to = ids.findIndex((id) => id === over.id);
        if (from >= 0 && to >= 0) onOrderChange(arrayMove(ids, from, to));
      }}
    >
      <SortableContext
        disabled={props.disabled}
        items={ids}
        strategy={horizontalListSortingStrategy}
      >
        <StepProgress {...props} StepContainer={SortableStep} />
      </SortableContext>
    </DndContext>
  );
}
