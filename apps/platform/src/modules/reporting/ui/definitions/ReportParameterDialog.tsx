"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { toast } from "@/shared/ui/Toast";
import {
  reportParameterEditorSchema,
  type ReportParameterEditorValues,
} from "../../api/ReportParameterEditorSchema";
import {
  reportParameterDefinitionSchema,
  type ReportParameterDefinition,
} from "../../domain/ReportParameters";
import { ReportParameterField } from "../ReportParameterFields";
import { reportParameterBindingLabels } from "./ReportParameterPresentation";

export function ReportParameterDialog({
  parameters,
  editingIndex,
  disabled,
  onClose,
  onSave,
}: {
  parameters: ReportParameterDefinition[];
  editingIndex?: number;
  disabled: boolean;
  onClose: () => void;
  onSave: (parameter: ReportParameterDefinition) => void;
}) {
  const parameter =
    editingIndex === undefined ? undefined : parameters[editingIndex];
  const form = useForm<
    ReportParameterEditorValues,
    unknown,
    ReportParameterDefinition
  >({
    resolver: zodResolver(
      reportParameterEditorSchema(parameters, editingIndex),
    ),
    defaultValues: {
      ...(parameter ?? {
        name: "",
        position: parameters.length + 1,
        type: "text",
        nullable: false,
        binding: "value",
      }),
      hasDefault: parameter?.defaultValue !== undefined,
    },
  });
  const values = useWatch({ control: form.control });
  const binding = values.binding ?? "value";
  const definition = {
    name: "Default value",
    position: values.position ?? 1,
    type: values.type ?? "text",
    nullable: values.nullable ?? false,
    binding,
  };
  const submit = form.handleSubmit(
    (saved) => {
      if (disabled) {
        return;
      }
      onSave(saved);
      onClose();
    },
    () => toast.error("Check the highlighted parameter fields."),
  );

  return (
    <DraggableDialog
      isOpen
      title={parameter ? "Edit parameter" : "Add parameter"}
      size="2xl"
      onClose={onClose}
    >
      <FormProvider {...form}>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.stopPropagation();
            void submit(event);
          }}
        >
          <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Parameter name" name="name" required />
            <FormInput
              label="SQL position"
              name="position"
              type="number"
              readOnly
              registrationOptions={{ valueAsNumber: true }}
            />
            <FormSelect
              label="Binding"
              name="binding"
              items={Object.entries(reportParameterBindingLabels).map(
                ([value, label]) => ({ value, label }),
              )}
              onChange={(event) => {
                const next = event.target
                  .value as ReportParameterDefinition["binding"];
                form.setValue("binding", next, { shouldDirty: true });
                if (next !== "value") {
                  form.setValue(
                    "type",
                    next === "run-at" ? "timestamp" : "timezone",
                    { shouldDirty: true },
                  );
                  form.setValue("hasDefault", false, { shouldDirty: true });
                  form.unregister("defaultValue");
                }
              }}
            />
            <FormSelect
              label="Type"
              name="type"
              disabled={binding !== "value"}
              items={reportParameterDefinitionSchema.shape.type.options.map(
                (value) => ({ value, label: value }),
              )}
              onChange={(event) => {
                form.setValue(
                  "type",
                  event.target.value as ReportParameterDefinition["type"],
                  { shouldDirty: true },
                );
                form.setValue("hasDefault", false, { shouldDirty: true });
                form.unregister("defaultValue");
              }}
            />
            <CheckboxField label="Allow no value" name="nullable" />
            {binding === "value" ? (
              <CheckboxField label="Use a default value" name="hasDefault" />
            ) : null}
            {binding === "value" && values.hasDefault ? (
              <ReportParameterField
                key={`${definition.type}/${definition.nullable}`}
                definition={definition}
                path="defaultValue"
                disabled={disabled}
              />
            ) : null}
          </fieldset>
          <div className="flex justify-end gap-2">
            <GeneralButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </GeneralButton>
            <GeneralButton type="submit" disabled={disabled}>
              Save parameter
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
