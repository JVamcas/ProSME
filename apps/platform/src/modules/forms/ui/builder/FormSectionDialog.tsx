"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { formSectionSchema } from "@/modules/forms/api/FormSchemas";
import type { FormSection } from "@/modules/forms/FormTypes";

export function FormSectionDialog({
  isOpen,
  nextOrder,
  onClose,
  onSave,
  section,
}: {
  isOpen: boolean;
  nextOrder: number;
  onClose: () => void;
  onSave: (section: FormSection) => Promise<void>;
  section?: FormSection;
}) {
  return isOpen ? (
    <FormSectionDialogContent
      nextOrder={nextOrder}
      onClose={onClose}
      onSave={onSave}
      section={section}
    />
  ) : null;
}

function FormSectionDialogContent({
  nextOrder,
  onClose,
  onSave,
  section,
}: Omit<Parameters<typeof FormSectionDialog>[0], "isOpen">) {
  const form = useForm<
    z.input<typeof formSectionSchema>,
    unknown,
    z.output<typeof formSectionSchema>
  >({
    defaultValues: section ?? {
      columnSpan: 3,
      description: "",
      key: "",
      order: nextOrder,
      showContainer: true,
      title: "",
    },
    resolver: zodResolver(formSectionSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save the section.",
      );
    }
  });
  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      title={section ? "Edit section" : "Add section"}
    >
      <FormProvider {...form}>
        <form className="space-y-4" onSubmit={submit}>
          <FormInput
            label="Section key"
            name="key"
            placeholder="BUSINESS_DETAILS"
            required
          />
          <FormInput label="Title" name="title" required />
          <FormSelect
            items={[
              { label: "One column (one-third width)", value: 1 },
              { label: "Two columns (two-thirds width)", value: 2 },
              { label: "Three columns (full width)", value: 3 },
            ]}
            label="Section width"
            name="columnSpan"
            required
          />
          <FormTextarea label="Description" name="description" />
          <CheckboxField
            label="Show section title and container"
            name="showContainer"
          />
          <div className="flex justify-end">
            <GeneralButton
              disabled={form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? "Saving…" : "Save section"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
