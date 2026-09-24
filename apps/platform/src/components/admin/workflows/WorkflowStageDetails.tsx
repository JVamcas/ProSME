import type { ReactNode } from "react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowAssignmentOptions,
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageTaskTable } from "@/modules/workflows/ui/definitions/WorkflowStageTaskTable";
import { WorkflowStageActionTable } from "@/modules/workflows/ui/definitions/WorkflowStageActionTable";
import { WorkflowStageTransitionTable } from "@/modules/workflows/ui/definitions/WorkflowStageTransitionTable";
import { WorkflowStageChecklistTable } from "@/modules/workflows/ui/definitions/WorkflowStageChecklistTable";
import type { WorkflowStageChecklistDefinition } from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";
import { WorkflowStageDocumentRequirementTable } from "@/modules/workflows/ui/definitions/WorkflowStageDocumentRequirementTable";
import type { WorkflowStageDocumentRequirement } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import { WorkflowStageScoringTable } from "@/modules/workflows/ui/definitions/WorkflowStageScoringTable";
import type { WorkflowStageScoringCriterion } from "@/modules/workflows/domain/definitions/WorkflowStageScoringDefinition";
import type { WorkflowStageCommentField } from "@/modules/workflows/domain/definitions/WorkflowStageCommentField";
import { WorkflowStageCommentFieldTable } from "@/modules/workflows/ui/definitions/WorkflowStageCommentFieldTable";
import { Badge, type BadgeProps } from "@/shared/ui/Badge";

type Props = {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  assignmentOptions?: WorkflowAssignmentOptions;
  editor: WorkflowEditorView;
  onAddAction: () => void;
  onAddTask: () => void;
  onAddChecklistItem: () => void;
  onAddDocumentRequirement: () => void;
  onAddScoringCriterion: () => void;
  onAddCommentField: () => void;
  onDelete: () => void;
  onDeleteAction: (action: WorkflowActionDefinition) => void;
  onEdit: () => void;
  onEditAction: (action: WorkflowActionDefinition) => void;
  onDeleteTask: (task: WorkflowTaskInput) => void;
  onEditTask: (task: WorkflowTaskInput) => void;
  onDeleteChecklistItem: (item: WorkflowStageChecklistDefinition) => void;
  onEditChecklistItem: (item: WorkflowStageChecklistDefinition) => void;
  onDeleteDocumentRequirement: (
    requirement: WorkflowStageDocumentRequirement,
  ) => void;
  onEditDocumentRequirement: (
    requirement: WorkflowStageDocumentRequirement,
  ) => void;
  onDeleteScoringCriterion: (
    criterion: WorkflowStageScoringCriterion,
  ) => void;
  onEditScoringCriterion: (
    criterion: WorkflowStageScoringCriterion,
  ) => void;
  onDeleteCommentField: (field: WorkflowStageCommentField) => void;
  onEditCommentField: (field: WorkflowStageCommentField) => void;
  onPreviewTask: (task: WorkflowTaskInput) => void;
  stage?: WorkflowStageInput;
  stageIndex: number;
};

export function WorkflowStageDetails({
  canEdit,
  canDelete,
  isDeleting,
  assignmentOptions,
  editor,
  onAddAction,
  onAddTask,
  onAddChecklistItem,
  onAddDocumentRequirement,
  onAddScoringCriterion,
  onAddCommentField,
  onDelete,
  onDeleteAction,
  onEdit,
  onEditAction,
  onDeleteTask,
  onEditTask,
  onDeleteChecklistItem,
  onEditChecklistItem,
  onDeleteDocumentRequirement,
  onEditDocumentRequirement,
  onDeleteScoringCriterion,
  onEditScoringCriterion,
  onDeleteCommentField,
  onEditCommentField,
  onPreviewTask,
  stage,
  stageIndex,
}: Props) {
  if (!stage) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-brand-navy/15 text-sm text-brand-navy/55">
        Select a stage to view its details.
      </div>
    );
  }

  const workTabs = [
    {
      id: "tasks",
      label: "Tasks",
      content: (
        <StageTabContent>
          <WorkflowStageTaskTable
            assignmentOptions={assignmentOptions}
            canEdit={canEdit}
            onAdd={onAddTask}
            onDelete={onDeleteTask}
            onEdit={onEditTask}
            onPreview={onPreviewTask}
            stage={stage}
          />
        </StageTabContent>
      ),
    },
    {
      id: "checklists",
      label: "Checklists",
      content: (
        <StageTabContent>
          <WorkflowStageChecklistTable
            canEdit={canEdit}
            onAdd={onAddChecklistItem}
            onDelete={onDeleteChecklistItem}
            onEdit={onEditChecklistItem}
            stage={stage}
          />
        </StageTabContent>
      ),
    },
    {
      id: "documents",
      label: "Documents",
      content: (
        <StageTabContent>
          <WorkflowStageDocumentRequirementTable
            canEdit={canEdit}
            onAdd={onAddDocumentRequirement}
            onDelete={onDeleteDocumentRequirement}
            onEdit={onEditDocumentRequirement}
            stage={stage}
          />
        </StageTabContent>
      ),
    },
    {
      id: "scoring",
      label: "Scoring",
      content: (
        <StageTabContent>
          <WorkflowStageScoringTable
            canEdit={canEdit}
            editor={editor}
            onAdd={onAddScoringCriterion}
            onDelete={onDeleteScoringCriterion}
            onEdit={onEditScoringCriterion}
            stage={stage}
          />
        </StageTabContent>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      content: (
        <StageTabContent>
          <WorkflowStageActionTable
            canEdit={canEdit}
            onAdd={onAddAction}
            onDelete={onDeleteAction}
            onEdit={onEditAction}
            stage={stage}
          />
        </StageTabContent>
      ),
    },
    {
      id: "comments",
      label: "Comments & Recommendations",
      content: (
        <StageTabContent>
          <WorkflowStageCommentFieldTable
            canEdit={canEdit}
            onAdd={onAddCommentField}
            onDelete={onDeleteCommentField}
            onEdit={onEditCommentField}
            stage={stage}
          />
        </StageTabContent>
      ),
    },
    {
      id: "transition",
      label: "Transition",
      content: (
        <StageTabContent>
          <WorkflowStageTransitionTable
            canEdit={canEdit}
            editor={editor}
            stage={stage}
          />
        </StageTabContent>
      ),
    },
  ] satisfies readonly TabItem<
    | "tasks"
    | "checklists"
    | "documents"
    | "scoring"
    | "comments"
    | "actions"
    | "transition"
  >[];

  return (
    <article className="rounded-2xl border border-brand-navy/15 bg-brand-white p-5">
      <StageDetailHeader
        canEdit={canEdit}
        canDelete={canDelete}
        isDeleting={isDeleting}
        onDelete={onDelete}
        onEdit={onEdit}
        stage={stage}
        stageIndex={stageIndex}
      />
      <StageConfiguration stage={stage} />
      <div className="mt-5">
        <Tabs
          ariaLabel={`${stage.name} stage configuration`}
          defaultSelectedId="tasks"
          items={workTabs}
        />
      </div>
    </article>
  );
}

function StageTabContent({ children }: { children: ReactNode }) {
  return <div className="[&>section]:mt-0">{children}</div>;
}

function StageConfiguration({ stage }: { stage: WorkflowStageInput }) {
  const badges = [
    {
      label: stage.enabled ? "Enabled" : "Disabled",
      variant: stage.enabled ? "success" : "outline",
    },
    {
      label: stage.optional ? "Optional" : "Required",
      variant: stage.optional ? "outlineOrange" : "red",
    },
    {
      label: stage.repeatable ? "Repeatable" : "Single-run",
      variant: stage.repeatable ? "yellow" : "outlineOrange",
    },
    {
      label: stage.coiGated ? "COI-gated" : "No COI gate",
      variant: stage.coiGated ? "primary" : "outlineOrange",
    },
  ] satisfies Array<{ label: string; variant: BadgeProps["variant"] }>;

  return (
    <dl className="mt-4 grid gap-3 rounded-xl border border-brand-navy/10 p-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-semibold text-brand-navy/55">Stable key</dt>
        <dd className="font-mono text-brand-navy">{stage.stableKey}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-brand-navy/55">Display order</dt>
        <dd className="text-brand-navy">{stage.displayOrder}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs font-semibold text-brand-navy/55">Description</dt>
        <dd className="text-brand-navy">{stage.description || "No description"}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-brand-navy/55">Configuration</dt>
        <dd className="mt-1.5 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant}>
              {badge.label}
            </Badge>
          ))}
        </dd>
      </div>
    </dl>
  );
}

function StageDetailHeader({
  canEdit,
  canDelete,
  isDeleting,
  onDelete,
  onEdit,
  stage,
  stageIndex,
}: {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
  stage: WorkflowStageInput;
  stageIndex: number;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-navy/10 pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy/45">
          Stage {stageIndex + 1} · Approval
        </p>
        <h3 className="mt-1 text-lg font-bold text-brand-navy">{stage.name}</h3>
      </div>
      <div className="flex items-center gap-2">
        <EditButton disabled={!canEdit} onClick={onEdit} title="Edit stage" />
        <DeleteButton
          disabled={!canDelete}
          isLoading={isDeleting}
          onClick={onDelete}
          title="Delete stage"
        />
      </div>
    </header>
  );
}
