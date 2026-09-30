// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import { WorkflowTaskFormLayoutStep } from "@/modules/workflows/ui/definitions/WorkflowTaskFormLayoutStep";
import { WorkflowTaskAssignmentStep } from "@/modules/workflows/ui/definitions/WorkflowTaskAssignmentStep";
import { workflowTaskFormItems } from "@/modules/workflows/ui/definitions/WorkflowTaskDialogController";
import type { WorkflowTaskFormValues } from "@/modules/workflows/ui/definitions/WorkflowTaskFormSchema";

const attachedVersionId = "68cecb68-3f4f-4862-a958-92942187cf04";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

function TaskFields({
  completionMode = "COUNT",
  formItems,
  formPurpose = "APPLICATION_REVIEW",
  section = "form",
}: {
  completionMode?: WorkflowTaskFormValues["completionMode"];
  formItems: { label: string; value: string }[];
  formPurpose?: WorkflowTaskFormValues["formPurpose"];
  section?: "assignment" | "form";
}) {
  const form = useForm<WorkflowTaskFormValues>({
    defaultValues: {
      assignmentMode: "ROLE",
      assignmentTarget: "reviewer",
      completionMode,
      completionPercentage: completionMode === "PERCENT" ? 75 : null,
      description: "",
      displayMode: "STEP_PROGRESS",
      displayOrder: 1,
      formVersionId: attachedVersionId,
      formPurpose,
      name: "Finance Review",
      required: true,
      requiredCompletionCount: 1,
      reviewerCount: 1,
      stableKey: "FINANCE_REVIEW",
      taskType: "CONTRIBUTING",
    },
  });
  const formVersionId = useWatch({
    control: form.control,
    name: "formVersionId",
  });
  return (
    <FormProvider {...form}>
      {section === "form" ? (
        <WorkflowTaskFormLayoutStep
          formItems={formItems}
          formPurpose={formPurpose}
          formVersionId={formVersionId ?? ""}
          formsPending={formItems.length === 0}
        />
      ) : (
        <WorkflowTaskAssignmentStep
          assignmentItems={[{ label: "Reviewer", value: "reviewer" }]}
          assignmentMode="ROLE"
        />
      )}
    </FormProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow task form selection", () => {
  it("shows a stored unavailable binding instead of claiming no form is selected", () => {
    expect(workflowTaskFormItems([], attachedVersionId)).toEqual([
      {
        label: "Unavailable form version — remove or replace",
        value: attachedVersionId,
      },
    ]);
  });

  it("only offers published forms with the selected purpose", () => {
    const forms = [
      {
        definitionId: "10000000-0000-4000-8000-000000000001",
        formName: "Application",
        purpose: "FUNDING_APPLICATION" as const,
        versionId: "20000000-0000-4000-8000-000000000001",
        versionNumber: 1,
      },
      {
        definitionId: "10000000-0000-4000-8000-000000000002",
        formName: "Review",
        purpose: "APPLICATION_REVIEW" as const,
        versionId: "20000000-0000-4000-8000-000000000002",
        versionNumber: 1,
      },
    ];
    expect(
      workflowTaskFormItems(forms, "", true, "APPLICATION_REVIEW"),
    ).toEqual([
      {
        label: "Review · v1",
        value: forms[1].versionId,
      },
    ]);
  });

  it("offers only the two task form purposes and leaves the form optional", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<TaskFields formItems={[]} />));

    const purpose = container.querySelector<HTMLSelectElement>(
      'select[name="formPurpose"]',
    );
    expect(
      Array.from(purpose?.options ?? [], (option) => option.value),
    ).toEqual(["APPLICATION_REVIEW", "ELIGIBILITY_VERIFICATION"]);
    expect(
      container.querySelector<HTMLSelectElement>('select[name="formVersionId"]')
        ?.required,
    ).toBe(false);
    const layout = container.querySelector<HTMLSelectElement>(
      'select[name="displayMode"]',
    );
    expect(layout?.value).toBe("STEP_PROGRESS");
    expect(Array.from(layout?.options ?? [], (option) => option.value)).toEqual(
      ["STEP_PROGRESS", "SECTIONS"],
    );

    await act(async () => root.unmount());
  });

  it("uses the funding call form for eligibility tasks without offering another version", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(
        <TaskFields
          formItems={[
            { label: "Other eligibility form · v1", value: attachedVersionId },
          ]}
          formPurpose="ELIGIBILITY_VERIFICATION"
        />,
      ),
    );

    expect(container.querySelector('select[name="formVersionId"]')).toBeNull();
    expect(container.textContent).toContain(
      "The eligibility form attached to the funding call is used when this task runs.",
    );

    await act(async () => root.unmount());
  });

  it("retains the attached form while published-form options load", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<TaskFields formItems={[]} />));
    await act(async () =>
      root.render(
        <TaskFields
          formItems={[
            {
              label: "Finance Assessment · v1",
              value: attachedVersionId,
            },
          ]}
        />,
      ),
    );

    const formSelect = container.querySelector<HTMLSelectElement>(
      'select[name="formVersionId"]',
    );
    expect(formSelect?.value).toBe(attachedVersionId);
    expect(container.textContent).not.toContain("Read-only runtime context");
    expect(container.textContent).not.toContain("Element permissions");
    expect(container.textContent).not.toContain("Require quorum");
    expect(container.textContent).not.toContain(
      "Require conflict-of-interest clearance",
    );

    await act(async () => root.unmount());
  });

  it("shows the value field required by the completion mode", async () => {
    const countContainer = document.createElement("div");
    const percentageContainer = document.createElement("div");
    document.body.append(countContainer, percentageContainer);
    const countRoot = createRoot(countContainer);
    const percentageRoot = createRoot(percentageContainer);

    await act(async () =>
      countRoot.render(<TaskFields formItems={[]} section="assignment" />),
    );
    await act(async () =>
      percentageRoot.render(
        <TaskFields
          completionMode="PERCENT"
          formItems={[]}
          section="assignment"
        />,
      ),
    );

    expect(countContainer.textContent).toContain("Required completions");
    expect(countContainer.textContent).not.toContain("Completion percentage");
    expect(percentageContainer.textContent).toContain("Completion percentage");
    expect(percentageContainer.textContent).not.toContain(
      "Required completions",
    );

    await act(async () => countRoot.unmount());
    await act(async () => percentageRoot.unmount());
  });
});
