"use client";

import Form, { type IChangeEvent } from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { calculateFormScores } from "../../engine/FormScoring";
import { FormScoringAggregateWidget } from "./FormScoringAggregateWidget";
import { WorkflowFormDocumentWidget } from "@/modules/workflows/ui/forms/WorkflowFormDocumentWidget";
import { FormCheckboxWidget } from "./FormCheckboxWidget";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  formRendererValidationErrors,
  formRendererSubmitHandler,
  valuesForFields,
} from "./FormRendererValidation";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import type { FormRuntimeContext } from "@/modules/forms/engine/FormRuntimeContext";
import { parseFormDefinition } from "@/modules/forms/engine/FormDefinitionParser";
import { calculateFormCompleteness } from "@/modules/forms/engine/FormCompleteness";
import { activeFormDefinition } from "@/modules/forms/engine/FormVisibility";
import { validateFormValues } from "@/modules/forms/FormValidation";
import {
  FormCompletenessSummary,
  type SupplementalCompletion,
} from "./FormCompletenessSummary";
import {
  FormBaseInputTemplate,
  FormCurrencyWidget,
  FormDateWidget,
  FormFieldTemplate,
  FormRadioWidget,
  FormRichTextWidget,
  FormPercentageWidget,
  FormSelectWidget,
  FormTextareaWidget,
} from "./RjsfTheme";
import { FormStepActions, FormStepProgress } from "./FormStepNavigation";
import {
  RepeatableArrayFieldItemTemplate,
  RepeatableArrayFieldTemplate,
} from "./RepeatableGroupTemplates";
import { useFormStepProgress } from "./useFormStepProgress";

import { FormObjectTemplate, type RendererContext } from "./FormObjectTemplate";

export type DynamicFormValues = Record<string, unknown>;

type FormRendererProps = {
  onStepOrderChange?: (ids: string[]) => void;
  orderingPending?: boolean;
  workflowTaskId?: string;
  workflowDocuments?: boolean;
  children?: ReactNode;
  onFinalStepChange?: (final: boolean) => void;
  definition: FormRuntimeSchema;
  formData: DynamicFormValues;
  onChange: (values: DynamicFormValues) => void;
  onSubmit: (values: DynamicFormValues) => void;
  penultimateStep?: { content: ReactNode; id: string; title: string };
  readOnly?: boolean;
  readOnlyFieldKeys?: readonly string[];
  runtimeContext?: FormRuntimeContext;
  showCompleteness?: boolean;
  stepPersistenceKey?: string;
  supplementalCompletion?: SupplementalCompletion;
};

function readOnlyFieldUiSchema(
  base: UiSchema,
  keys: readonly string[],
): UiSchema {
  return {
    ...base,
    ...Object.fromEntries(
      keys.map((key) => [
        key,
        { ...base[key], "ui:disabled": true, "ui:readonly": true },
      ]),
    ),
  };
}

const formTemplates = {
  ArrayFieldItemTemplate: RepeatableArrayFieldItemTemplate,
  ArrayFieldTemplate: RepeatableArrayFieldTemplate,
  BaseInputTemplate: FormBaseInputTemplate,
  FieldTemplate: FormFieldTemplate,
  ObjectFieldTemplate: FormObjectTemplate,
};
const formWidgets = {
  workflowDocument: WorkflowFormDocumentWidget,
  scoreAggregate: FormScoringAggregateWidget,
  CheckboxWidget: FormCheckboxWidget,
  currency: FormCurrencyWidget,
  DateWidget: FormDateWidget,
  percentage: FormPercentageWidget,
  richText: FormRichTextWidget,
  RadioWidget: FormRadioWidget,
  SelectWidget: FormSelectWidget,
  TextareaWidget: FormTextareaWidget,
};

function useRendererDefinition(
  definition: FormRuntimeSchema,
  suppliedFormData: DynamicFormValues,
  workflowDocuments: boolean,
) {
  const formData = useMemo(
    () =>
      calculateFormScores(
        activeFormDefinition(definition, suppliedFormData).fields,
        suppliedFormData,
      ),
    [definition, suppliedFormData],
  );
  const activeDefinition = useMemo(
    () => activeFormDefinition(definition, formData),
    [definition, formData],
  );
  const parsed = useMemo(
    () => parseFormDefinition(definition, formData, workflowDocuments),
    [definition, formData, workflowDocuments],
  );
  const completeness = useMemo(
    () => calculateFormCompleteness(activeDefinition, formData),
    [activeDefinition, formData],
  );
  return { formData, activeDefinition, parsed, completeness };
}

function rendererSteps(
  sections: ReturnType<typeof parseFormDefinition>["sections"],
  stepMode: boolean,
  penultimateStep: FormRendererProps["penultimateStep"],
) {
  if (!stepMode || !penultimateStep) return sections;
  return [
    ...sections.slice(0, -1),
    { id: penultimateStep.id, title: penultimateStep.title },
    ...sections.slice(-1),
  ];
}

export function FormRenderer({
  children,
  onStepOrderChange,
  orderingPending,
  workflowTaskId,
  workflowDocuments = false,
  definition,
  formData: suppliedFormData,
  onChange,
  onSubmit,
  onFinalStepChange,
  penultimateStep,
  readOnly = false,
  readOnlyFieldKeys = [],
  runtimeContext = {},
  showCompleteness = true,
  stepPersistenceKey,
  supplementalCompletion,
}: FormRendererProps) {
  const { formData, activeDefinition, parsed, completeness } = useRendererDefinition(
    definition,
    suppliedFormData,
    workflowDocuments || Boolean(workflowTaskId),
  );
  const [validationAttempted, setValidationAttempted] = useState(false);
  const stepMode = definition.displayMode === "STEPS";
  const steps = rendererSteps(parsed.sections, stepMode, penultimateStep);
  const { completedStepIds, currentStepId, markStepComplete, navigateToStep } =
    useFormStepProgress({
      persistenceKey: stepPersistenceKey,
      steps,
    });

  const currentIndex = stepMode
    ? Math.max(
        0,
        steps.findIndex((step) => step.id === currentStepId),
      )
    : 0;
  const documentStepActive =
    stepMode &&
    Boolean(penultimateStep) &&
    currentStepId === penultimateStep?.id;
  const isFinalStep = !stepMode || currentIndex === steps.length - 1;
  useEffect(() => {
    onFinalStepChange?.(isFinalStep);
  }, [isFinalStep, onFinalStepChange]);
  const currentSection = documentStepActive
    ? undefined
    : parsed.sections.find((section) => section.id === steps[currentIndex]?.id);
  const currentFields = currentSection
    ? activeDefinition.fields.filter(
        (field) => field.sectionId === currentSection.id,
      )
    : [];
  const extraErrors = formRendererValidationErrors(
    activeDefinition.fields,
    stepMode ? currentFields : activeDefinition.fields,
    formData,
    validationAttempted,
  );
  const context = useMemo(
    () => ({
      activeSectionId: stepMode ? currentSection?.id : undefined,
      runtimeContext,
      workflowTaskId,
      sections: parsed.sections,
    }),
    [
      currentSection?.id,
      parsed.sections,
      runtimeContext,
      stepMode,
      workflowTaskId,
    ],
  );
  const uiSchema = useMemo(
    () => readOnlyFieldUiSchema(parsed.uiSchema, readOnlyFieldKeys),
    [parsed.uiSchema, readOnlyFieldKeys],
  );


  return (
    <div className="space-y-5">
      {parsed.instructions ? (
        <p className="text-sm text-brand-navy/70">{parsed.instructions}</p>
      ) : null}
      {showCompleteness ? (
        <FormCompletenessSummary
          completeness={completeness}
          supplementalCompletion={supplementalCompletion}
        />
      ) : null}
      {stepMode ? (
        <FormStepProgress
          completedStepIds={completedStepIds}
          currentIndex={currentIndex}
          onStepChange={navigateToStep}
          onOrderChange={onStepOrderChange}
          orderingPending={orderingPending}
          steps={steps}
        />
      ) : null}
      {documentStepActive ? (
        <>
          {penultimateStep?.content}
          <FormStepActions
            currentIndex={currentIndex}
            onBack={() => navigateToStep(steps[currentIndex - 1]?.id)}
            onNext={() => {
              markStepComplete(steps[currentIndex]?.id);
              navigateToStep(steps[currentIndex + 1]?.id);
            }}
            stepCount={steps.length}
          />
        </>
      ) : (
        <Form<DynamicFormValues, RJSFSchema, RendererContext>
          disabled={readOnly}
          experimental_defaultFormStateBehavior={{ constAsDefaults: "never" }}
          formContext={context}
          formData={formData}
          extraErrors={extraErrors}
          noHtml5Validate
          omitExtraData
          onChange={(event: IChangeEvent<DynamicFormValues>) => {
            setValidationAttempted(false);
            onChange(
              calculateFormScores(
                activeDefinition.fields,
                event.formData ?? {},
              ),
            );
          }}
          onSubmit={formRendererSubmitHandler(
            activeDefinition.fields,
            onSubmit,
            () => setValidationAttempted(true),
          )}
          schema={parsed.schema}
          showErrorList={false}
          templates={formTemplates}
          uiSchema={uiSchema}
          validator={validator}
          widgets={formWidgets}
        >
          {stepMode ? (
            <FormStepActions
              currentIndex={currentIndex}
              onBack={() => {
                setValidationAttempted(false);
                navigateToStep(steps[currentIndex - 1]?.id);
              }}
              onNext={() => {
                if (
                  !readOnly &&
                  !validateFormValues(
                    currentFields,
                    valuesForFields(currentFields, formData),
                    true,
                    formData,
                  )
                ) {
                  setValidationAttempted(true);
                  return;
                }
                setValidationAttempted(false);
                markStepComplete(steps[currentIndex]?.id);
                navigateToStep(steps[currentIndex + 1]?.id);
              }}
              stepCount={steps.length}
            />
          ) : null}
          {!stepMode || currentIndex === steps.length - 1 ? children : null}
        </Form>
      )}
    </div>
  );
}
