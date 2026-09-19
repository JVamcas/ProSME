"use client";

import Form, { type IChangeEvent } from "@rjsf/core";
import type { ObjectFieldTemplateProps, RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useMemo, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import {
  parseFormDefinition,
  type RenderSection,
} from "@/modules/forms/engine/FormDefinitionParser";
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

export type DynamicFormValues = Record<string, unknown>;

type RendererContext = {
  sections: RenderSection[];
};

function sectionSpan(columnSpan: RenderSection["columnSpan"]) {
  if (columnSpan === 1) return "col-span-1";
  if (columnSpan === 2) return "col-span-1 lg:col-span-2";
  return "col-span-1 lg:col-span-2 2xl:col-span-3";
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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {props.registry.formContext.sections.map((section) => (
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
      ))}
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
}: {
  children?: ReactNode;
  definition: FormRuntimeSchema;
  formData: DynamicFormValues;
  onChange: (values: DynamicFormValues) => void;
  onSubmit: (values: DynamicFormValues) => void;
  readOnly?: boolean;
}) {
  const parsed = useMemo(
    () => parseFormDefinition(definition),
    [definition],
  );
  const context = useMemo(
    () => ({ sections: parsed.sections }),
    [parsed.sections],
  );

  return (
    <div className="space-y-5">
      {parsed.instructions ? (
        <p className="text-sm text-brand-navy/70">{parsed.instructions}</p>
      ) : null}
      <Form<DynamicFormValues, RJSFSchema, RendererContext>
        disabled={readOnly}
        formContext={context}
        formData={formData}
        noHtml5Validate
        omitExtraData
        onChange={(event: IChangeEvent<DynamicFormValues>) => {
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
        {children}
      </Form>
    </div>
  );
}
