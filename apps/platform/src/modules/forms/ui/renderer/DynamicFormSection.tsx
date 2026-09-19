"use client";

import { cn } from "@/lib/utils";
import type { FormField, FormSection } from "@/modules/forms/FormTypes";
import { DynamicFormField } from "./DynamicFormField";

function sectionSpanClass(columnSpan: FormSection["columnSpan"]) {
  if (columnSpan === 1) return "col-span-1";
  if (columnSpan === 2) return "col-span-1 lg:col-span-2";
  return "col-span-1 lg:col-span-2 2xl:col-span-3";
}

function sectionGridClass(columnSpan: FormSection["columnSpan"]) {
  if (columnSpan === 1) return "grid-cols-1";
  if (columnSpan === 2) return "grid-cols-1 md:grid-cols-2";
  return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
}

function fieldSpanClass(columnSpan: FormField["columnSpan"]) {
  if (columnSpan === 1) return "col-span-1";
  if (columnSpan === 2) return "col-span-1 md:col-span-2";
  return "col-span-1 md:col-span-2 xl:col-span-3";
}

export function DynamicFormSection({
  fields,
  readOnly,
  section,
}: {
  fields: FormField[];
  readOnly: boolean;
  section: FormSection;
}) {
  const headingId = `form-section-${section.id ?? section.key}`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        sectionSpanClass(section.columnSpan),
        section.showContainer
          ? "rounded-2xl border border-brand-navy/10 bg-brand-white p-5"
          : "",
      )}
    >
      <h2
        className={cn(
          "font-bold text-brand-navy",
          !section.showContainer && "sr-only",
        )}
        id={headingId}
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
          sectionGridClass(section.columnSpan),
        )}
      >
        {fields.map((field) => (
          <div className={fieldSpanClass(field.columnSpan)} key={field.key}>
            <DynamicFormField field={field} readOnly={readOnly} />
          </div>
        ))}
      </div>
    </section>
  );
}
