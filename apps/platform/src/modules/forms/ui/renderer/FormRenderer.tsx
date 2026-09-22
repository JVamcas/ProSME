"use client";

import Form, { type IChangeEvent } from "@rjsf/core";
import type {
  ErrorSchema,
  ObjectFieldTemplateProps,
  RJSFSchema,
} from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import type { FormRuntimeContext } from "@/modules/forms/engine/FormRuntimeContext";
import {
  parseFormDefinition,
  type RenderSection,
} from "@/modules/forms/engine/FormDefinitionParser";
import { calculateFormCompleteness } from "@/modules/forms/engine/FormCompleteness";
import { activeFormDefinition } from "@/modules/forms/engine/FormVisibility";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { FormCompletenessSummary } from "./FormCompletenessSummary";
import {
  formColumnCount,
  formGridClass,
} from "./FormLayout";
import {
  FormBaseInputTemplate,
  FormCurrencyWidget,
  FormDateWidget,
  FormFieldTemplate,
  FormRadioWidget,
  FormPercentageWidget,
  FormSelectWidget,
  FormTextareaWidget,
} from "./RjsfTheme";
import { FormStepActions, FormStepProgress } from "./FormStepNavigation";

export type DynamicFormValues = Record<string, unknown>;

type RendererContext = {
  activeSectionId?: string;
  runtimeContext: FormRuntimeContext;
  sections: RenderSection[];
};

function sectionSpan(columnSpan: RenderSection["columnSpan"]) {
  if (columnSpan === 1) return "col-span-1";
  if (columnSpan === 2) return "col-span-1 md:col-span-2";
  return "col-span-1 md:col-span-2 xl:col-span-3";
}

function sectionColumns(columnSpan: RenderSection["columnSpan"]) {
  if (columnSpan === 1) return "grid-cols-1";
  if (columnSpan === 2) return "grid-cols-1 md:grid-cols-2";
  return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
}

function fieldSpan(columnSpan: 1 | 2 | 3) {
  if (columnSpan === 1) return "col-span-1";
  if (columnSpan === 2) return "col-span-1 md:col-span-2";
  return "col-span-1 md:col-span-2 xl:col-span-3";
}

function FormObjectTemplate(
  props: ObjectFieldTemplateProps<
    DynamicFormValues,
    RJSFSchema,
    RendererContext
  >,
) {
  const properties = new Map(
    props.properties.map((property) => [property.name, property.content]),
  );
  return (
    <div
      className={cn(
        "grid gap-5",
        formGridClass(formColumnCount(props.registry.formContext.sections)),
      )}
    >
      {props.registry.formContext.sections
        .filter((section) => (
          !props.registry.formContext.activeSectionId
          || section.id === props.registry.formContext.activeSectionId
        ))
        .map((section) => {
        return (
          <section
            aria-labelledby={`form-section-${section.id}`}
            className={cn(
              sectionSpan(section.columnSpan),
              section.showContainer
                ? "rounded-2xl border border-brand-navy/10 bg-brand-white p-5"
                : "",
            )}
            key={section.id}
          >
            <h2
              className={cn(
                "font-bold text-brand-navy",
                !section.showContainer && "sr-only",
              )}
              id={`form-section-${section.id}`}
            >
              {section.title}
            </h2>
            {section.showContainer && section.description ? (
              <p className="mt-1 text-sm text-brand-navy/65">
                {section.description}
              </p>
            ) : null}
            <div
              className={cn(
                "grid gap-5",
                section.showContainer && "mt-4",
                sectionColumns(section.columnSpan),
              )}
            >
              {section.fields.map((field) => (
                <div className={fieldSpan(field.columnSpan)} key={field.key}>
                  {properties.get(field.key)}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function FormRenderer({
  children,
  definition,
  formData,
  onChange,
  onSubmit,
  readOnly = false,
  runtimeContext = {},
}: {
  children?: ReactNode;
  definition: FormRuntimeSchema;
  formData: DynamicFormValues;
  onChange: (values: DynamicFormValues) => void;
  onSubmit: (values: DynamicFormValues) => void;
  readOnly?: boolean;
  runtimeContext?: FormRuntimeContext;
}) {
  const [currentSectionId, setCurrentSectionId] = useState<string>();
  const [validationAttempted, setValidationAttempted] = useState(false);
  const activeDefinition = useMemo(
    () => activeFormDefinition(definition, formData),
    [definition, formData],
  );
  const parsed = useMemo(
    () => parseFormDefinition(definition, formData),
    [definition, formData],
  );
  const stepMode = definition.displayMode === "STEPS";
  const currentIndex = stepMode
    ? Math.max(
        0,
        parsed.sections.findIndex((section) => section.id === currentSectionId),
      )
    : 0;
  const currentSection = parsed.sections[currentIndex];
  const currentFields = currentSection
    ? activeDefinition.fields.filter(
        (field) => field.sectionId === currentSection.id,
      )
    : [];
  const invalidFields = validationAttempted
    ? currentFields.filter((field) => !validateFormValues([field], formData, true))
    : [];
  const extraErrors = Object.fromEntries(
    invalidFields.map((field) => [
      field.key,
      { __errors: ["Complete or correct this field before continuing."] },
    ]),
  ) as ErrorSchema<DynamicFormValues>;
  const context = useMemo(
    () => ({
      activeSectionId: stepMode ? currentSection?.id : undefined,
      runtimeContext,
      sections: parsed.sections,
    }),
    [currentSection?.id, parsed.sections, runtimeContext, stepMode],
  );
  const completeness = useMemo(
    () => calculateFormCompleteness(activeDefinition, formData),
    [activeDefinition, formData],
  );

  return (
    <div className="space-y-5">
      {parsed.instructions ? (
        <p className="text-sm text-brand-navy/70">{parsed.instructions}</p>
      ) : null}
      <FormCompletenessSummary completeness={completeness} />
      {stepMode ? (
        <FormStepProgress
          currentIndex={currentIndex}
          sections={parsed.sections}
        />
      ) : null}
      <Form<DynamicFormValues, RJSFSchema, RendererContext>
        disabled={readOnly}
        formContext={context}
        formData={formData}
        extraErrors={extraErrors}
        noHtml5Validate
        omitExtraData
        onChange={(event: IChangeEvent<DynamicFormValues>) => {
          setValidationAttempted(false);
          onChange(event.formData ?? {});
        }}
        onSubmit={(event: IChangeEvent<DynamicFormValues>) => {
          onSubmit(event.formData ?? {});
        }}
        schema={parsed.schema}
        showErrorList={false}
        templates={{
          BaseInputTemplate: FormBaseInputTemplate,
          FieldTemplate: FormFieldTemplate,
          ObjectFieldTemplate: FormObjectTemplate,
        }}
        uiSchema={parsed.uiSchema}
        validator={validator}
        widgets={{
          currency: FormCurrencyWidget,
          DateWidget: FormDateWidget,
          percentage: FormPercentageWidget,
          RadioWidget: FormRadioWidget,
          SelectWidget: FormSelectWidget,
          TextareaWidget: FormTextareaWidget,
        }}
      >
        {stepMode ? (
          <FormStepActions
            currentIndex={currentIndex}
            onBack={() => {
              setValidationAttempted(false);
              setCurrentSectionId(parsed.sections[currentIndex - 1]?.id);
            }}
            onNext={() => {
              if (!readOnly && !validateFormValues(currentFields, formData, true)) {
                setValidationAttempted(true);
                return;
              }
              setValidationAttempted(false);
              setCurrentSectionId(parsed.sections[currentIndex + 1]?.id);
            }}
            stepCount={parsed.sections.length}
          />
        ) : null}
        {!stepMode || currentIndex === parsed.sections.length - 1
          ? children
          : null}
      </Form>
    </div>
  );
}
