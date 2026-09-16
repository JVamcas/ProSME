"use client";

import { FormProvider } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { useTaskForm } from "@/modules/forms/FormHooks";
import { DynamicFormField } from "./DynamicFormField";
import {
  useDynamicFormController,
  type TaskFormData,
} from "./DynamicFormController";

function FormActions({
  completePending,
  readOnly,
  savePending,
  submitLabel,
  onComplete,
}: {
  completePending: boolean;
  readOnly: boolean;
  savePending: boolean;
  submitLabel: string;
  onComplete: () => void;
}) {
  if (readOnly) return null;
  const disabled = savePending || completePending;
  return (
    <div className="flex justify-end gap-3">
      <GeneralButton disabled={disabled} type="submit">
        {savePending ? "Saving…" : "Save draft"}
      </GeneralButton>
      <GeneralButton disabled={disabled} onClick={onComplete} type="button">
        {completePending ? "Submitting…" : submitLabel}
      </GeneralButton>
    </div>
  );
}

function FormErrors({
  saveError,
  completeError,
}: {
  saveError?: Error | null;
  completeError?: Error | null;
}) {
  const message = saveError?.message ?? completeError?.message;
  if (!message) return null;
  return <p className="text-sm text-red-700" role="alert">{message}</p>;
}

function LoadedDynamicFormTask({
  taskId,
  data,
}: {
  taskId: string;
  data: TaskFormData;
}) {
  const controller = useDynamicFormController(taskId, data);
  const saveDraft = controller.form.handleSubmit(controller.saveDraftValues);
  const completeForm = controller.form.handleSubmit(
    controller.completeFormValues,
  );
  const readOnly = data.submission?.status === "COMPLETED";
  return (
    <FormProvider {...controller.form}>
      <form className="space-y-5" noValidate onSubmit={saveDraft}>
        {data.schema.instructions ? (
          <p className="text-sm text-brand-navy/70">{data.schema.instructions}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {data.schema.fields.map((field) => (
            <DynamicFormField
              field={field}
              key={field.code}
              readOnly={readOnly}
            />
          ))}
        </div>
        <FormErrors
          completeError={controller.complete.error}
          saveError={controller.save.error}
        />
        <FormActions
          completePending={controller.complete.isPending}
          onComplete={completeForm}
          readOnly={readOnly}
          savePending={controller.save.isPending}
          submitLabel={data.schema.submitLabel}
        />
      </form>
    </FormProvider>
  );
}

export function DynamicFormTask({ taskId }: { taskId: string }) {
  const query = useTaskForm(taskId);
  if (query.isPending) return <p>Loading form…</p>;
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error?.message ?? "Form unavailable."}
      </p>
    );
  }
  return <LoadedDynamicFormTask data={query.data} taskId={taskId} />;
}
