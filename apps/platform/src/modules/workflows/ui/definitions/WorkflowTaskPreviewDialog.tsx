"use client";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { usePublishedFormRuntime } from "@/modules/forms/FormHooks";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import {
  formColumnCount,
  previewPanelClass,
} from "@/modules/forms/ui/renderer/FormLayout";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskActions } from "@/modules/work-queue/ui/WorkflowTaskActions";
import type {
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { checklistItemDefaults } from "./WorkflowTaskFormSchema";

type PublishedFormQuery = ReturnType<typeof usePublishedFormRuntime>;

function TaskWorkPreview({
  form,
  task,
}: {
  form: PublishedFormQuery;
  task: WorkflowTaskInput;
}) {
  if (task.formBinding) {
    if (form.isPending) return <p className="text-sm">Loading form preview…</p>;
    if (form.isError || !form.data) {
      return (
        <p className="text-sm text-red-700" role="alert">
          {form.error?.message ?? "The bound form is unavailable."}
        </p>
      );
    }
    return (
      <FormRenderer
        definition={form.data}
        formData={{}}
        onChange={() => undefined}
        onSubmit={() => undefined}
        readOnly
      >
        <></>
      </FormRenderer>
    );
  }
  const checklistItems = checklistItemDefaults(task.config);
  if (checklistItems.length) {
    return (
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <label
            className="flex gap-3 rounded-xl border border-brand-navy/10 p-4 text-sm text-brand-navy"
            key={item.code}
          >
            <input disabled type="checkbox" />
            <span>
              {item.label}
              {item.required ? <span className="text-brand-orange"> *</span> : null}
            </span>
          </label>
        ))}
      </div>
    );
  }
  return (
    <p className="rounded-xl bg-brand-cream p-4 text-sm text-brand-navy/70">
      This task uses its configured {task.type.replaceAll("_", " ").toLowerCase()} controls.
    </p>
  );
}

export function WorkflowTaskPreviewDialog({
  onClose,
  stage,
  task,
}: {
  onClose: () => void;
  stage: WorkflowStageInput;
  task: WorkflowTaskInput;
}) {
  const form = usePublishedFormRuntime(task.formBinding?.formVersionId ?? null);
  const actions = workflowTaskPreviewActions(stage, task);
  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      panelClassName={workflowTaskPreviewPanelClass(form.data)}
      size="2xl"
      title={`${task.name} - Reviewer's preview`}
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/50">
            {stage.name}
          </p>
          {task.description ? (
            <p className="mt-1 text-sm text-brand-navy/70">{task.description}</p>
          ) : null}
        </div>
        <TaskWorkPreview form={form} task={task} />
        <WorkflowTaskActions
          actions={actions}
          disabled
          onSelect={() => undefined}
        />
      </div>
    </DraggableDialog>
  );
}

export function workflowTaskPreviewPanelClass(
  definition?: Pick<FormRuntimeSchema, "sections">,
) {
  return definition
    ? previewPanelClass(formColumnCount(definition.sections))
    : undefined;
}

export function workflowTaskPreviewActions(
  stage: WorkflowStageInput,
  task: WorkflowTaskInput,
) {
  const selected = new Set(task.actionKeys);
  return stage.actions
    .filter(
      (action) =>
        action.enabled
        && selected.has(action.stableKey),
    )
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((action) => ({
      actionType: action.actionType,
      key: action.stableKey,
      label: action.label,
    })) satisfies WorkflowTaskAction[];
}
