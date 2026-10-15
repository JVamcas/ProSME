"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { StepProgress } from "@/shared/ui/StepProgress";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { generateWorkflowStableKey } from "@/modules/workflows/domain/WorkflowStableKey";
import { type FormField, type FormSection } from "@/modules/forms/FormTypes";

import { documentFieldConfiguration } from "../../domain/FormDocumentConfiguration";
import { FormFieldDialogFields } from "./FormFieldDialogFields";

type FieldDialogValues = z.input<typeof formFieldSchema>;

function defaultField(sectionId: string, order: number): FieldDialogValues {
  return {
    columnSpan: 1,
    helpText: "",
    key: generateWorkflowStableKey(),
    label: "",
    maximum: undefined,
    maxLength: undefined,
    minimum: undefined,
    minLength: undefined,
    options: [],
    order,
    required: false,
    repeatable: undefined,
    sectionId,
    type: "TEXT",
    visibilityCondition: null,
  };
}

function FormFieldDialogContent({
  field,
  fields,
  nextOrder,
  onClose,
  onSave,
  sectionColumnSpan,
  sectionId,
}: {
  field?: FormField;
  fields: readonly FormField[];
  nextOrder: number;
  onClose: () => void;
  onSave: (field: FormField) => Promise<void>;
  sectionColumnSpan: FormSection["columnSpan"];
  sectionId: string;
}) {
  const form = useForm<
    z.input<typeof formFieldSchema>,
    unknown,
    z.output<typeof formFieldSchema>
  >({
    defaultValues: field
      ? {
          ...field,
          ...(field.type === "DOCUMENT"
            ? documentFieldConfiguration(field)
            : {}),
        }
      : defaultField(sectionId, nextOrder),
    resolver: zodResolver(formFieldSchema),
  });
  const [step, setStep] = useState<"details" | "configuration">("details");
  async function changeStep(next: "details" | "configuration") {
    if (
      next === "details" ||
      (await form.trigger(["label", "type", "columnSpan"], {
        shouldFocus: true,
      }))
    ) {
      setStep(next);
    }
  }
  const type = useWatch({ control: form.control, name: "type" });

  useEffect(() => {
    if (type !== "SINGLE_SELECT" && type !== "MULTI_SELECT") {
      form.setValue("options", []);
    }
    if (!["NUMBER", "CURRENCY", "PERCENTAGE", "SCORE"].includes(type)) {
      form.setValue("minimum", undefined);
      form.setValue("maximum", undefined);
    }
    if (!["TEXT", "TEXTAREA", "COMMENT"].includes(type)) {
      form.setValue("minLength", undefined);
      form.setValue("maxLength", undefined);
    }
    if (type !== "DOCUMENT") form.setValue("workflowDocument", undefined);
    if (type !== "DOCUMENT") {
      form.setValue("uploadedBy", undefined);
      form.setValue("acceptedExtensions", undefined);
      form.setValue("maxPages", undefined);
      form.setValue("maximumFileSizeMb", undefined);
    }
    if (type !== "SCORING_AGGREGATE")
      form.setValue("scoringAggregate", undefined);
    if (type !== "REPEATABLE_GROUP") {
      form.setValue("repeatable", undefined);
    } else if (!form.getValues("repeatable")) {
      form.setValue("repeatable", {
        addLabel: "Add row",
        fields: [
          {
            columnSpan: 1,
            helpText: "",
            key: "FIELD_1",
            label: "Field 1",
            options: [],
            order: 1,
            required: true,
            type: "TEXT",
          },
        ],
        itemLabel: "Row",
        maximumItems: 20,
        minimumItems: 1,
      });
    }
    if (type === "DOCUMENT" && !form.getValues("uploadedBy")) {
      form.setValue("uploadedBy", "APPLICANT");
    }
  }, [form, type]);

  const submit = form.handleSubmit(
    async (values) => {
      try {
        await onSave({
          ...values,
          workflowDocument: values.workflowDocument
            ? {
                ...values.workflowDocument,
                stableKey: field?.workflowDocument?.stableKey ?? values.key,
              }
            : values.workflowDocument,
        });
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to save the field.",
        );
      }
    },
    (errors) => {
      setStep(
        errors.label || errors.type || errors.columnSpan
          ? "details"
          : "configuration",
      );
    },
  );

  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      title={field ? "Edit field" : "Add field"}
      size="2xl"
    >
      <FormProvider {...form}>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            if (step === "details") {
              event.preventDefault();
              void changeStep("configuration");
            } else {
              void submit(event);
            }
          }}
        >
          <StepProgress
            ariaLabel="Field setup progress"
            steps={[
              { id: "details", label: "Details" },
              { id: "configuration", label: "Configuration" },
            ]}
            currentStepId={step}
            completedStepIds={step === "configuration" ? ["details"] : []}
            disabled={form.formState.isSubmitting}
            onStepChange={changeStep}
          />
          <FormFieldDialogFields
            step={step}
            fields={fields}
            sectionColumnSpan={sectionColumnSpan}
          />
          <div className="flex justify-between">
            {step === "configuration" ? (
              <GeneralButton
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={() => setStep("details")}
              >
                Back
              </GeneralButton>
            ) : (
              <span />
            )}
            <GeneralButton disabled={form.formState.isSubmitting} type="submit">
              {step === "details"
                ? "Next"
                : form.formState.isSubmitting
                  ? "Saving…"
                  : "Save field"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}

export function FormFieldDialog({
  field,
  fields,
  isOpen,
  nextOrder,
  onClose,
  onSave,
  sectionColumnSpan,
  sectionId,
}: {
  field?: FormField;
  fields: readonly FormField[];
  isOpen: boolean;
  nextOrder: number;
  onClose: () => void;
  onSave: (field: FormField) => Promise<void>;
  sectionColumnSpan?: FormSection["columnSpan"];
  sectionId?: string;
}) {
  if (!isOpen || !sectionId || !sectionColumnSpan) return null;
  return (
    <FormFieldDialogContent
      field={field}
      fields={fields}
      key={field?.id ?? `${sectionId}-${nextOrder}`}
      nextOrder={nextOrder}
      onClose={onClose}
      onSave={onSave}
      sectionColumnSpan={sectionColumnSpan}
      sectionId={sectionId}
    />
  );
}
