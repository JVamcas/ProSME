"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
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
  onSave: (section: FormSection) => void;
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
      description: "",
      key: "",
      order: nextOrder,
      title: "",
    },
    resolver: zodResolver(formSectionSchema),
  });
  const submit = form.handleSubmit((values) => {
    onSave(values);
    onClose();
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
          <FormTextarea label="Description" name="description" />
          <div className="flex justify-end">
            <GeneralButton type="submit">Save section</GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
