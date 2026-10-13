"use client";
import type { ObjectFieldTemplateProps, RJSFSchema } from "@rjsf/utils";
import type { FormRuntimeContext } from "../../engine/FormRuntimeContext";
import type { RenderSection } from "../../engine/FormDefinitionParser";
import type { DynamicFormValues } from "./FormRenderer";
import { cn } from "@/lib/utils";
import { formColumnCount, formGridClass } from "./FormLayout";
export type RendererContext = {
  workflowTaskId?: string;
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

export function FormObjectTemplate(
  props: ObjectFieldTemplateProps<
    DynamicFormValues,
    RJSFSchema,
    RendererContext
  >,
) {
  if (props.fieldPathId.path.length > 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {props.properties.map((property) => (
          <div key={property.name}>{property.content}</div>
        ))}
      </div>
    );
  }
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
        .filter(
          (section) =>
            !props.registry.formContext.activeSectionId ||
            section.id === props.registry.formContext.activeSectionId,
        )
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
