"use client";

import { useState } from "react";
import { DropdownButton } from "@/shared/ui/DropdownButton";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import type { ReportTemplate } from "../../domain/ReportDefinition";
import { ReportTemplateValidationForm } from "./ReportTemplateValidationForm";
import { useValidateReportTemplate } from "./useReportDefinition";
import { reportParameterDefaultValues } from "./ReportParameterPresentation";

export function ReportTemplateActions({
  canEdit,
  canPublish,
  canValidate,
  disabled,
  formId,
  isDirty,
  template,
}: {
  canEdit: boolean;
  canPublish: boolean;
  canValidate: boolean;
  disabled: boolean;
  formId: string;
  isDirty: boolean;
  template?: ReportTemplate;
}) {
  const [validationOpen, setValidationOpen] = useState(false);
  const publication = useValidateReportTemplate(template?.id ?? "", true);
  const busy = disabled || publication.isPending;
  const savedDraftDisabled = busy || isDirty || !template;

  function publish() {
    if (!template) {
      return;
    }
    const requiresValues = template.definition.parameters.some(
      (parameter) =>
        parameter.binding === "value" &&
        !parameter.nullable &&
        parameter.defaultValue === undefined,
    );
    if (requiresValues) {
      setValidationOpen(true);
      return;
    }
    publication.mutate({
      rowVersion: template.rowVersion,
      values: reportParameterDefaultValues(template.definition.parameters),
    });
  }

  if (!canEdit && !(template && (canPublish || canValidate))) {
    return null;
  }

  return (
    <>
      <DropdownButton
        ariaLabel="Report template actions"
        disabled={busy}
        label="Save Draft"
        items={[
          {
            id: "save",
            label: "Save Draft",
            disabled: !canEdit,
            onAction: () => {
              const form = document.getElementById(formId);
              if (form instanceof HTMLFormElement) {
                form.requestSubmit();
              }
            },
          },
          {
            id: "publish",
            label: "Publish",
            disabled: !canPublish || savedDraftDisabled,
            onAction: publish,
          },
          {
            id: "validate",
            label: "Validate",
            disabled: !canValidate || busy || !template,
            onAction: () => setValidationOpen(true),
          },
        ]}
      />
      <RightDrawer
        onClose={() => setValidationOpen(false)}
        open={validationOpen}
        size="xl"
        title="Validate saved draft"
      >
        {template ? (
          <ReportTemplateValidationForm
            key={template.rowVersion}
            template={template}
            canPublish={canPublish}
            disabled={busy || isDirty}
          />
        ) : null}
      </RightDrawer>
      {publication.isSuccess ? (
        <p role="status">An immutable version was published.</p>
      ) : null}
    </>
  );
}
