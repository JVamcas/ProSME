"use client";

import { useState } from "react";
import type { FieldErrors, FieldPath, UseFormReturn } from "react-hook-form";
import type { ReportTemplateInput } from "../../api/ReportManagementSchemas";

export type ReportTemplateFormValues = Omit<ReportTemplateInput, "key">;

export const reportTemplateSteps = [
  { id: "details", label: "Details" },
  { id: "sql", label: "SQL" },
  { id: "parameters", label: "Parameters" },
  { id: "output", label: "Output" },
  { id: "review", label: "Save & publish" },
] as const;

export type ReportTemplateStep = (typeof reportTemplateSteps)[number]["id"];

const stepFields: Record<
  ReportTemplateStep,
  FieldPath<ReportTemplateFormValues>[]
> = {
  details: [
    "name",
    "description",
    "definition.datasetKey",
    "definition.datasetVersion",
  ],
  sql: ["definition.sql"],
  parameters: ["definition.parameters"],
  output: ["definition.columns", "definition.formats"],
  review: [],
};

export function useReportTemplateSteps(
  form: UseFormReturn<ReportTemplateFormValues, unknown, ReportTemplateInput>,
) {
  const [currentStep, setCurrentStep] = useState<ReportTemplateStep>("details");
  const [completedSteps, setCompletedSteps] = useState<ReportTemplateStep[]>(
    [],
  );
  const currentIndex = reportTemplateSteps.findIndex(
    (step) => step.id === currentStep,
  );

  async function changeStep(target: ReportTemplateStep) {
    const targetIndex = reportTemplateSteps.findIndex(
      (step) => step.id === target,
    );
    if (targetIndex > currentIndex) {
      for (const step of reportTemplateSteps.slice(currentIndex, targetIndex)) {
        const valid = await form.trigger(stepFields[step.id], {
          shouldFocus: true,
        });
        if (!valid) {
          setCompletedSteps((completed) =>
            completed.filter((id) => id !== step.id),
          );
          setCurrentStep(step.id);
          return;
        }
        setCompletedSteps((completed) =>
          completed.includes(step.id) ? completed : [...completed, step.id],
        );
      }
    }
    setCurrentStep(target);
  }

  function showInvalidStep(errors: FieldErrors<ReportTemplateFormValues>) {
    if (
      errors.name ||
      errors.description ||
      errors.definition?.datasetKey ||
      errors.definition?.datasetVersion
    ) {
      setCurrentStep("details");
    } else if (errors.definition?.sql) {
      setCurrentStep("sql");
    } else if (errors.definition?.parameters) {
      setCurrentStep("parameters");
    } else if (errors.definition?.columns || errors.definition?.formats) {
      setCurrentStep("output");
    }
  }

  return {
    currentStep,
    currentIndex,
    completedSteps,
    changeStep,
    showInvalidStep,
    next: () => changeStep(reportTemplateSteps[currentIndex + 1].id),
    back: () => changeStep(reportTemplateSteps[currentIndex - 1].id),
  };
}
