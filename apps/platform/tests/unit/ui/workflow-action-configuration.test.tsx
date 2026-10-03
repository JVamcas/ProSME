import { renderToStaticMarkup } from "react-dom/server";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { WorkflowActionConfigurationFields } from "@/modules/workflows/ui/definitions/WorkflowActionConfigurationFields";
import type { WorkflowActionType } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import {
  type WorkflowActionFormValues,
  workflowActionFormSchema,
  workflowActionTypeItems,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormSchema";
import { workflowActionFormDefaults } from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";

function ActionConfigurationForm({
  actionType,
}: {
  actionType: WorkflowActionType;
}) {
  const form = useForm<WorkflowActionFormValues>({
    defaultValues: workflowActionFormDefaults(undefined, 1, ["REVIEW_TASK"]),
  });
  return (
    <FormProvider {...form}>
      <WorkflowActionConfigurationFields
        actionType={actionType}
        assignmentOptions={{ roles: [], users: [] }}
        deferTargetType="DATE"
        escalationTargetType="ROLE"
      />
    </FormProvider>
  );
}

describe("workflow action configuration UI", () => {
  it("does not offer Refer and rejects historical Refer form values", () => {
    expect(workflowActionTypeItems.map((item) => item.value)).not.toContain(
      "REFER",
    );
    expect(
      workflowActionFormSchema.safeParse({
        ...workflowActionFormDefaults(undefined, 1, ["REVIEW_TASK"]),
        actionType: "REFER",
      }).success,
    ).toBe(false);
  });

  it("keeps approve routing out of action-specific configuration", () => {
    const markup = renderToStaticMarkup(
      <ActionConfigurationForm actionType="APPROVE_ADVANCE" />,
    );
    expect(markup).toBe("");
    const values = {
      ...workflowActionFormDefaults(undefined, 1, ["REVIEW_TASK"]),
      stableKey: "ADVANCE",
      label: "Advance",
    };
    expect(workflowActionFormSchema.parse(values).actionType).toBe(
      "APPROVE_ADVANCE",
    );
  });

  it("shows the heading when an action has configuration fields", () => {
    const markup = renderToStaticMarkup(
      <ActionConfigurationForm actionType="RETURN" />,
    );
    expect(markup).toContain("Action-specific configuration");
    expect(markup).toContain("Default returned data (chosen at runtime)");
  });
  it("keeps rejection settings out of Behaviour", () => {
    expect(
      renderToStaticMarkup(<ActionConfigurationForm actionType="REJECT" />),
    ).toBe("");
  });
});
