"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { GeneralButton } from "@/shared/ui/Button";
import { formFieldSchema } from "../../api/FormSchemas";
import { fieldsBeforeFormField } from "../../engine/FormRuleConfiguration";
import type { FormField, FormSection } from "../../FormTypes";
import { FormFieldRulePanel } from "./FormFieldRulePanel";

export function FormFieldRulesDialog({
  field,
  fields,
  sections,
  onSave,
  onClose,
}: {
  field: FormField;
  fields: FormField[];
  sections: FormSection[];
  onSave: (field: FormField) => Promise<void>;
  onClose: () => void;
}) {
  const form = useForm<
    z.input<typeof formFieldSchema>,
    unknown,
    z.output<typeof formFieldSchema>
  >({
    defaultValues: field,
    resolver: zodResolver(formFieldSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save validation rules.",
      );
    }
  });
  return (
    <DraggableDialog
      isOpen
      title={`Validation Rules · ${field.label}`}
      onClose={onClose}
      size="2xl"
    >
      <FormProvider {...form}>
        <form className="space-y-4" onSubmit={submit}>
          <FormFieldRulePanel
            field={field}
            fields={fields}
            precedingFields={fieldsBeforeFormField(fields, sections, field)}
          />
          <div className="flex justify-end">
            <GeneralButton disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Saving…" : "Save rules"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
