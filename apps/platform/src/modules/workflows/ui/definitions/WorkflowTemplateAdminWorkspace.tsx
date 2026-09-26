"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { getErrorMessage } from "@/lib/client-http";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import { toast } from "@/shared/ui/Toast";
import {
  useCloneWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useWorkflowListLifecycle,
  useWorkflowTemplates,
} from "../../WorkflowHooks";
import { showWorkflowPublicationError } from "./WorkflowPublicationErrorToast";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import { WorkflowTemplateCreateForm } from "./WorkflowTemplateCreateForm";
import { WorkflowTemplateTable } from "./WorkflowTemplateTable";

type Props = {
  canCreate: boolean;
  canPublish: boolean;
  canUpdate: boolean;
};

export function WorkflowTemplateAdminWorkspace({
  canCreate,
  canPublish,
  canUpdate,
}: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplateListItem>();
  const [deleteCandidate, setDeleteCandidate] =
    useState<WorkflowTemplateListItem>();
  const [publishCandidate, setPublishCandidate] =
    useState<WorkflowTemplateListItem>();
  const templates = useWorkflowTemplates(page, pageSize);
  const cloneTemplate = useCloneWorkflowTemplate();
  const deleteTemplate = useDeleteWorkflowTemplate();
  const publishTemplate = useWorkflowListLifecycle("publish");
  const emptyMessage = templates.isLoading
    ? "Loading workflow templates…"
    : (templates.error?.message ??
      "No workflow templates yet. Create a template to begin.");

  return (
    <div className="space-y-4">
      {canCreate ? (
        <div className="flex justify-end">
          <GeneralButton
            onClick={() => {
              setSelectedTemplate(undefined);
              setIsDialogOpen(true);
            }}
            size="sm"
          >
            <Plus className="size-4" />
            Create template
          </GeneralButton>
        </div>
      ) : null}
      <WorkflowTemplateTable
        canPublish={canPublish}
        canUpdate={canUpdate}
        cloningVersionId={
          cloneTemplate.isPending
            ? cloneTemplate.variables?.currentVersion.id
            : undefined
        }
        deletingId={
          deleteTemplate.isPending ? deleteTemplate.variables?.id : undefined
        }
        emptyMessage={emptyMessage}
        items={templates.data?.items ?? []}
        isFetching={templates.isFetching}
        page={templates.data?.page ?? page}
        pageSize={templates.data?.pageSize ?? pageSize}
        total={templates.data?.total ?? 0}
        totalPages={templates.data?.totalPages ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        onClone={(template) => {
          cloneTemplate.mutate(template, {
            onError: (error) => {
              toast.error(
                getErrorMessage(error) ?? "Unable to clone the workflow.",
              );
            },
          });
        }}
        onDelete={setDeleteCandidate}
        onEdit={(template) => {
          setSelectedTemplate(template);
          setIsDialogOpen(true);
        }}
        onPublish={setPublishCandidate}
        publishingId={
          publishTemplate.isPending ? publishTemplate.variables : undefined
        }
      />
      <DraggableDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={selectedTemplate
          ? "Edit workflow template"
          : "Create workflow template"}
      >
        <WorkflowTemplateCreateForm
          key={selectedTemplate?.currentVersion.id ?? "create"}
          onCompleted={() => setIsDialogOpen(false)}
          template={selectedTemplate}
        />
      </DraggableDialog>
      <ConfirmationDialog
        confirmLabel="Publish"
        isOpen={Boolean(publishCandidate)}
        isPending={publishTemplate.isPending}
        message={publishCandidate
          ? `Publish ${publishCandidate.name} version ${publishCandidate.currentVersion.number}? Published workflow versions cannot be edited.`
          : ""}
        onClose={() => setPublishCandidate(undefined)}
        onConfirm={() => {
          if (!publishCandidate) return;
          publishTemplate.mutate(publishCandidate.id, {
            onError: showWorkflowPublicationError,
            onSuccess: () => setPublishCandidate(undefined),
          });
        }}
        pendingLabel="Publishing…"
        title="Publish workflow template"
      />
      <ConfirmationDialog
        confirmLabel="Delete"
        isOpen={Boolean(deleteCandidate)}
        isPending={deleteTemplate.isPending}
        message={deleteCandidate
          ? `Delete ${deleteCandidate.name}? This cannot be undone.`
          : ""}
        onClose={() => setDeleteCandidate(undefined)}
        onConfirm={() => {
          if (!deleteCandidate) return;
          deleteTemplate.mutate(deleteCandidate, {
            onError: (error) => {
              toast.error(
                getErrorMessage(error) ?? "Unable to delete the workflow.",
              );
            },
            onSuccess: () => {
              setDeleteCandidate(undefined);
              setPage(1);
            },
          });
        }}
        pendingLabel="Deleting…"
        title="Delete workflow template"
      />
    </div>
  );
}
