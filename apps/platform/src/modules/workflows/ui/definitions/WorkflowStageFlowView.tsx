import { useMemo, type ReactNode } from "react";
import { ResizableSidebarLayout } from "@/shared/ui/ResizableSidebarLayout";
import { WorkflowStageDetails } from "@/components/admin/workflows/WorkflowStageDetails";
import {
  WorkflowFlowToolbar,
  WorkflowStagesHeader,
} from "@/components/admin/workflows/WorkflowStageFlowParts";
import { WorkflowStageList } from "@/modules/workflows/ui/definitions/WorkflowStageList";
import { WorkflowVisualGraph } from "@/modules/workflows/ui/definitions/WorkflowVisualGraph";
import { WorkflowValidationAlert } from "@/modules/workflows/ui/definitions/WorkflowValidationAlert";
import { workflowStageAttention } from "./WorkflowStageAttention";
import type { WorkflowStageFlowViewModel } from "./WorkflowStageFlow";

export function WorkflowStageFlowView({
  children,
  view,
}: {
  children: ReactNode;
  view: WorkflowStageFlowViewModel;
}) {
  const {
    stages,
    setSelectedCode,
    showVisualFlow,
    setShowVisualFlow,
    layoutRevision,
    setLayoutRevision,
    setStageDialog,
    deletionValidation,
    deletionRoles,
    setActionDialog,
    setActionToDelete,
    setTaskDialog,
    setTaskToDelete,
    setTaskToPreview,
    setChecklistDialog,
    setChecklistItemToDelete,
    setDocumentRequirementDialog,
    setDocumentRequirementToDelete,
    deleteMutation,
    isEditingLocked,
    selectedStage,
    selectedIndex,
    commentOverlays,
    scoringOverlays,
    editor,
    openStageDelete,
  } = view;
  const attentionByStage = useMemo(
    () => workflowStageAttention(editor.graph, editor.validation),
    [editor.graph, editor.validation],
  );

  return (
    <section className="rounded-[28px] border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-6">
      <WorkflowStagesHeader
        disabled={isEditingLocked}
        onAddStage={() => setStageDialog("create")}
      />
      {deletionValidation ? (
        <div className="mt-5">
          <WorkflowValidationAlert validation={deletionValidation} />
        </div>
      ) : null}
      <div className="mt-7 overflow-hidden rounded-2xl border border-brand-navy/15">
        <WorkflowFlowToolbar
          isExpanded={showVisualFlow}
          onAutoArrange={() => {
            setShowVisualFlow(true);
            setLayoutRevision((revision) => revision + 1);
          }}
          stageCount={stages.length}
          onToggle={() => setShowVisualFlow((value) => !value)}
        />
        {showVisualFlow ? (
          <WorkflowVisualGraph
            attentionByStage={attentionByStage}
            canEdit={!isEditingLocked}
            canDelete={!isEditingLocked && stages.length > 1}
            isDeleting={deleteMutation.isPending}
            key={`${editor.version.rowVersion}-${layoutRevision}`}
            selectedCode={selectedStage?.stableKey}
            stages={stages}
            transitions={editor.graph.transitions}
            onSelect={setSelectedCode}
            onEdit={setStageDialog}
            onDelete={openStageDelete}
          />
        ) : null}
      </div>
      <div className="mt-6">
        <ResizableSidebarLayout
          resizeLabel="Resize stage details panel"
          sidebar={
            <WorkflowStageList
              attentionByStage={attentionByStage}
              connectionRoles={deletionRoles}
              selectedCode={selectedStage?.stableKey}
              stages={stages}
              onSelect={setSelectedCode}
            />
          }
        >
          <WorkflowStageDetails
            assignmentOptions={editor.assignmentOptions}
            canDelete={!isEditingLocked && stages.length > 1}
            canEdit={!isEditingLocked}
            editor={editor}
            isDeleting={deleteMutation.isPending}
            onAddAction={() => setActionDialog("create")}
            onAddChecklistItem={() => setChecklistDialog("create")}
            onAddDocumentRequirement={() =>
              setDocumentRequirementDialog("create")
            }
            onAddScoringCriterion={scoringOverlays.onAdd}
            onAddCommentField={commentOverlays.onAdd}
            onAddTask={() => setTaskDialog("create")}
            onDelete={() => selectedStage && openStageDelete(selectedStage)}
            onDeleteAction={setActionToDelete}
            onDeleteChecklistItem={setChecklistItemToDelete}
            onDeleteDocumentRequirement={setDocumentRequirementToDelete}
            onDeleteScoringCriterion={scoringOverlays.onDelete}
            onDeleteCommentField={commentOverlays.onDelete}
            onDeleteTask={setTaskToDelete}
            onEdit={() => selectedStage && setStageDialog(selectedStage)}
            onEditAction={setActionDialog}
            onEditChecklistItem={setChecklistDialog}
            onEditDocumentRequirement={setDocumentRequirementDialog}
            onEditScoringCriterion={scoringOverlays.onEdit}
            onEditCommentField={commentOverlays.onEdit}
            onEditTask={setTaskDialog}
            onPreviewTask={setTaskToPreview}
            stage={selectedStage}
            stageIndex={selectedIndex}
          />
        </ResizableSidebarLayout>
      </div>
      {children}
    </section>
  );
}
