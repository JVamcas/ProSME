// @vitest-environment happy-dom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { UseFormReturn } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowStageChecklistDialog } from "@/modules/workflows/ui/definitions/WorkflowStageChecklistDialog";
import { WorkflowStageCommentFieldDialog } from "@/modules/workflows/ui/definitions/WorkflowStageCommentFieldDialog";
import { WorkflowStageDocumentRequirementDialog } from "@/modules/workflows/ui/definitions/WorkflowStageDocumentRequirementDialog";
import { WorkflowStageScoringCriterionDialog } from "@/modules/workflows/ui/definitions/WorkflowStageScoringCriterionDialog";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

const harness = vi.hoisted(() => ({
  save: vi.fn(),
  form: null as Pick<UseFormReturn, "setValue"> | null,
}));
vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: () => ({ mutateAsync: harness.save, isPending: false }),
}));
vi.mock("@/shared/ui/DraggableDialog", () => ({
  DraggableDialog: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("react-hook-form", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...original,
    useForm: (...args: Parameters<typeof original.useForm>) => {
      const form = original.useForm(...args);
      harness.form = form;
      return form;
    },
  };
});
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const kinds = ["checklist", "comment", "document", "scoring"] as const;
type Kind = (typeof kinds)[number];

function setup(kind: Kind, editing: boolean) {
  const stage = structuredClone(referenceWorkflow.stages[0]);
  const taskStableKey = stage.tasks[0].stableKey;
  const checklist = {
    key: "ORIGINAL_KEY",
    text: "Original label",
    taskStableKey,
    displayOrder: 1,
    mandatory: true,
    notes: "",
    responseType: "YES_NO" as const,
    evidenceRequirement: "NONE" as const,
  };
  const comment = {
    key: "ORIGINAL_KEY",
    label: "Original label",
    taskStableKey,
    displayOrder: 1,
    mandatory: false,
    helpText: "",
  };
  const document = {
    stableKey: "ORIGINAL_KEY",
    name: "Original label",
    taskStableKey,
    acceptedFileTypes: ["PDF" as const],
    expiryDays: null,
    mandatory: true,
    maximumSizeMb: 10,
    requestOnStageActivation: false,
    templateReference: "",
    uploader: "APPLICANT" as const,
    verifier: "ASSIGNED_REVIEWER" as const,
  };
  const criterion = {
    taskStableKey,
    stableKey: "ORIGINAL_KEY",
    criterion: "Original label",
    description: "",
    mandatoryComment: false,
    scaleMinimum: 0,
    scaleMaximum: 10,
    weight: 1,
  };
  stage.checklistItems = [checklist];
  stage.commentFields = [comment];
  stage.documentRequirements = [document];
  stage.scoring = [
    { taskStableKey, aggregation: "WEIGHTED_AVERAGE", criteria: [criterion] },
  ];
  // These dialogs only consume the graph; the save hook is mocked above.
  const editor = {
    graph: { stages: [stage], transitions: [] },
  } as unknown as WorkflowEditorView;
  const props = { editor, stage, onClose: vi.fn() };
  const dialogs = {
    checklist: (
      <WorkflowStageChecklistDialog
        {...props}
        checklistItem={editing ? checklist : undefined}
      />
    ),
    comment: (
      <WorkflowStageCommentFieldDialog
        {...props}
        field={editing ? comment : undefined}
      />
    ),
    document: (
      <WorkflowStageDocumentRequirementDialog
        {...props}
        requirement={editing ? document : undefined}
      />
    ),
    scoring: (
      <WorkflowStageScoringCriterionDialog
        {...props}
        taskStableKey={taskStableKey}
        criterion={editing ? criterion : undefined}
      />
    ),
  };
  return { dialog: dialogs[kind], taskStableKey };
}

function savedKey(kind: Kind) {
  const stage = harness.save.mock.calls[0][0].stages[0];
  if (kind === "checklist") return stage.checklistItems.at(-1).key;
  if (kind === "comment") return stage.commentFields.at(-1).key;
  if (kind === "document") return stage.documentRequirements.at(-1).stableKey;
  return stage.scoring[0].criteria.at(-1).stableKey;
}

describe("automatic workflow requirement keys", () => {
  beforeEach(() => {
    harness.save.mockReset().mockResolvedValue(undefined);
  });
  it.each(kinds)(
    "generates collision-free keys for new %s items and hides the key input",
    async (kind) => {
      const { dialog, taskStableKey } = setup(kind, false);
      const container = document.createElement("div");
      const root = createRoot(container);
      try {
        await act(async () => {
          root.render(dialog);
        });
        expect(
          container.querySelector('[name="key"], [name="stableKey"]'),
        ).toBeNull();
        const labelField = {
          checklist: "text",
          comment: "label",
          document: "name",
          scoring: "criterion",
        }[kind];
        await act(async () => {
          harness.form!.setValue(labelField, "Original key");
          if (kind !== "scoring")
            harness.form!.setValue("taskStableKey", taskStableKey);
          container
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );
        });
        expect(harness.save).toHaveBeenCalledOnce();
        expect(savedKey(kind)).toMatch(/^K_[A-F0-9]{32}$/);
        expect(savedKey(kind)).not.toContain("ORIGINAL");
      } finally {
        await act(async () => {
          root.unmount();
        });
      }
    },
  );
  it.each(kinds)(
    "preserves the existing key when renaming a %s item",
    async (kind) => {
      const { dialog } = setup(kind, true);
      const container = document.createElement("div");
      const root = createRoot(container);
      try {
        await act(async () => {
          root.render(dialog);
        });
        const labelField = {
          checklist: "text",
          comment: "label",
          document: "name",
          scoring: "criterion",
        }[kind];
        await act(async () => {
          harness.form!.setValue(labelField, "Completely different label");
          container
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );
        });
        expect(harness.save).toHaveBeenCalledOnce();
        expect(savedKey(kind)).toBe("ORIGINAL_KEY");
      } finally {
        await act(async () => {
          root.unmount();
        });
      }
    },
  );
});
