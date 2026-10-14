"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";
import { FormInput } from "@/components/ui/form-fields";
import { GeneralButton } from "@/shared/ui/Button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { generateWorkflowStableKey } from "@/modules/workflows/domain/WorkflowStableKey";
import { formOptionSchema } from "../../api/FormSchemas";

const optionDetailsSchema = formOptionSchema.omit({ order: true });
type OptionDetails = z.infer<typeof optionDetailsSchema>;

export function FormSelectOptionDialog({
  existingKeys,
  onClose,
  onSave,
  option,
}: {
  existingKeys: string[];
  onClose: () => void;
  onSave: (option: OptionDetails) => void;
  option?: OptionDetails;
}) {
  const schema = optionDetailsSchema.superRefine((values, context) => {
    if (existingKeys.includes(values.key)) {
      context.addIssue({
        code: "custom",
        message: "This option key is already in use.",
        path: ["key"],
      });
    }
  });
  const form = useForm<OptionDetails>({
    defaultValues: option ?? { key: generateWorkflowStableKey(), label: "" },
    resolver: zodResolver(schema),
  });
  const submit = form.handleSubmit((values) => {
    onSave(values);
    onClose();
  });
  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      title={option ? "Edit option" : "Add option"}
    >
      <FormProvider {...form}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.stopPropagation();
            void submit(event);
          }}
        >
          <FormInput label="Option key" name="key" required />
          <FormInput label="Option label" name="label" required />
          <div className="flex justify-end gap-2">
            <GeneralButton onClick={onClose} type="button" variant="outline">
              Cancel
            </GeneralButton>
            <GeneralButton type="submit">Save option</GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
