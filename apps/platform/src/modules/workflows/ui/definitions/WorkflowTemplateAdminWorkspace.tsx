"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { getErrorMessage } from "@/lib/client-http";
import { toast } from "@/shared/ui/Toast";
import {
  useCloneWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useWorkflowListLifecycle,
  useWorkflowTemplates,
} from "../../WorkflowHooks";
import { WorkflowTemplateConfirmations } from "./WorkflowTemplateConfirmations";
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
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplateListItem>();
  const [sourceTemplate, setSourceTemplate] =
    useState<WorkflowTemplateListItem>();
  const [deleteCandidate, setDeleteCandidate] =
    useState<WorkflowTemplateListItem>();
  const [publishCandidate, setPublishCandidate] =
    useState<WorkflowTemplateListItem>();
  const templates = useWorkflowTemplates(page, pageSize);
  const cloneTemplate = useCloneWorkflowTemplate();
  const deleteTemplate = useDeleteWorkflowTemplate();
  const publishTemplate = useWorkflowListLifecycle(
    "publish",
    undefined,
    publishCandidate?.currentVersion.id,
  );
  const emptyMessage = templates.isLoading
    ? "Loading workflow templates…"
    : (templates.error?.message ??
      "No workflow templates yet. Create a template to begin.");

  function openVersion(template: WorkflowTemplateListItem) {
    router.push(
      `/admin/workflows/${template.id}?versionId=${template.currentVersion.id}`,
    );
  }

  function createDraft(template: WorkflowTemplateListItem) {
    cloneTemplate.mutate(template, {
      onSuccess: (editor) =>
        router.push(
          `/admin/workflows/${editor.definition.id}?versionId=${editor.version.id}`,
        ),
      onError: (error) =>
        toast.error(
          getErrorMessage(error) ?? "Unable to create a draft version.",
        ),
    });
  }

  return (
    <div className="space-y-4">
      {canCreate ? (
        <div className="flex justify-end">
          <GeneralButton
            onClick={() => {
              setSelectedTemplate(undefined);
              setSourceTemplate(undefined);
              setIsDialogOpen(true);
            }}
            size="sm"
          >
            <Plus className="size-4" />
            Create new template (v1)
          </GeneralButton>
        </div>
      ) : null}
      <WorkflowTemplateTable
        canCreate={canCreate}
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
        onCreateDraft={createDraft}
        onCreateTemplate={(template) => {
          setSelectedTemplate(undefined);
          setSourceTemplate(template);
          setIsDialogOpen(true);
        }}
        onDelete={setDeleteCandidate}
        onEdit={(template) => {
          if (template.currentVersion.status === "DRAFT") openVersion(template);
          else createDraft(template);
        }}
        onEditDefinition={(template) => {
          setSelectedTemplate(template);
          setSourceTemplate(undefined);
          setIsDialogOpen(true);
        }}
        onPublish={setPublishCandidate}
        publishingId={
          publishTemplate.isPending
            ? publishCandidate?.currentVersion.id
            : undefined
        }
      />
      <DraggableDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={
          selectedTemplate
            ? "Edit workflow template"
            : "Create new template (v1)"
        }
      >
        <WorkflowTemplateCreateForm
          key={
            selectedTemplate?.id ??
            sourceTemplate?.currentVersion.id ??
            "create"
          }
          onCompleted={() => setIsDialogOpen(false)}
          template={selectedTemplate}
          source={sourceTemplate}
        />
      </DraggableDialog>
      <WorkflowTemplateConfirmations
        deleteCandidate={deleteCandidate}
        publishCandidate={publishCandidate}
        deleteTemplate={deleteTemplate}
        publishTemplate={publishTemplate}
        setDeleteCandidate={setDeleteCandidate}
        setPublishCandidate={setPublishCandidate}
        onDeleted={() => setPage(1)}
      />
    </div>
  );
}
