"use client";
import { useContext, useEffect, useRef } from "react";
import type { FormSearchContent } from "@/modules/forms/domain/FormSearchContent";
import {
  WorkflowSearchContext,
  WorkflowSearchTarget,
} from "./WorkflowSearchTarget";

export function WorkflowFormSearchOutline({
  form,
  taskKey,
}: {
  form: FormSearchContent;
  taskKey: string;
}) {
  const { selected, stageKey } = useContext(WorkflowSearchContext);
  const ref = useRef<HTMLDetailsElement>(null);
  const active =
    selected?.stageKey === stageKey &&
    selected?.tab === "forms" &&
    selected.taskKey === taskKey;
  useEffect(() => {
    if (!active || !ref.current) return;
    ref.current.open = true;
    for (const section of ref.current.querySelectorAll<HTMLDetailsElement>(
      "details",
    )) {
      if (
        section.dataset.section === selected.itemKey ||
        form.sections
          .find((item) => item.id === section.dataset.section)
          ?.fields.some((field) => field.key === selected.itemKey)
      ) {
        section.open = true;
      }
    }
  }, [active, selected, form]);
  return (
    <details ref={ref} className="mt-3 w-full">
      <summary className="cursor-pointer font-semibold">
        Sections and fields
      </summary>
      <div className="mt-3 space-y-3">
        {form.sections.map((section) => (
          <details
            key={section.id}
            data-section={section.id}
            className="rounded-lg border border-brand-navy/15 p-3"
          >
            <summary className="cursor-pointer">{section.title}</summary>
            <WorkflowSearchTarget
              tab="forms"
              itemKey={section.id}
              taskKey={taskKey}
            >
              <p className="mt-2 font-semibold">{section.title}</p>
              {section.description && (
                <p className="text-sm">{section.description}</p>
              )}
            </WorkflowSearchTarget>
            <ul className="mt-3 space-y-3">
              {section.fields.map((field) => (
                <li key={field.key}>
                  <WorkflowSearchTarget
                    tab="forms"
                    itemKey={field.key}
                    taskKey={taskKey}
                  >
                    <p className="font-medium">{field.label}</p>
                    <p className="font-mono text-xs text-brand-navy/60">
                      {field.key}
                    </p>
                    {field.helpText && (
                      <p className="text-sm">{field.helpText}</p>
                    )}
                    {field.details?.length ? (
                      <p className="text-sm">{field.details.join(" · ")}</p>
                    ) : null}
                    {field.options.length > 0 && (
                      <p className="text-sm">{field.options.join(" · ")}</p>
                    )}
                  </WorkflowSearchTarget>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </details>
  );
}
