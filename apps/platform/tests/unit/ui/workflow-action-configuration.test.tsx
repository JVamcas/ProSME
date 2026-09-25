import { renderToStaticMarkup } from "react-dom/server";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { WorkflowActionConfigurationFields } from "@/modules/workflows/ui/definitions/WorkflowActionConfigurationFields";
import type { WorkflowActionType } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import {
  type WorkflowActionFormValues,
  workflowActionFormSchema,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormSchema";
import { workflowActionFormDefaults } from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";

function ActionConfigurationForm({ actionType }: { actionType: WorkflowActionType }) {
  const form = useForm<WorkflowActionFormValues>({
    defaultValues: workflowActionFormDefaults(undefined, 1, "REVIEW_TASK"),
  });
  return (
    <FormProvider {...form}>
      <WorkflowActionConfigurationFields
        actionType={actionType}
        assignmentOptions={{ roles: [], users: [] }}
        deferTargetType="DATE"
        escalationTargetType="ROLE"
        rejectionOutcomeType="TERMINAL"
      />
    </FormProvider>
  );
}

describe("workflow action configuration UI", () => {
  it("keeps approve routing out of action-specific configuration", () => {
    const markup = renderToStaticMarkup(
      <ActionConfigurationForm actionType="APPROVE_ADVANCE" />,
    );
    expect(markup).toBe("");
    const values = {
      ...workflowActionFormDefaults(undefined, 1, "REVIEW_TASK"),
      stableKey: "ADVANCE",
      label: "Advance",
    };
    expect(workflowActionFormSchema.parse(values).actionType).toBe(
      "APPROVE_ADVANCE",
    );
  });

  it("shows the heading when an action has configuration fields", () => {
    const markup = renderToStaticMarkup(
      <ActionConfigurationForm actionType="REJECT" />,
    );
    expect(markup).toContain("Action-specific configuration");
    expect(markup).toContain("Reason codes");
  });
});
