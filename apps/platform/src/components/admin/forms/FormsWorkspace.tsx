"use client";

import { useState } from "react";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import {
  useCloneForm,
  useCreateForm,
  useFormEditor,
  useFormLifecycle,
  useForms,
  useUpdateForm,
} from "@/modules/forms/FormHooks";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import { FormPreviewDialog } from "@/modules/forms/ui/renderer/FormPreviewDialog";
import { FormDefinitionDialogForm } from "./FormDefinitionDialogForm";
import {
  FormsTable,
  type FormTablePendingAction,
} from "./FormsTable";

export function FormsWorkspace({
  canCreate,
  canPublish,
  canRetire,
  canUpdate,
}: {
  canCreate: boolean;
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewing, setPreviewing] = useState<FormDefinitionSummary>();
  const [selected, setSelected] = useState<FormDefinitionSummary>();
  const query = useForms({ page, pageSize });
  const clone = useCloneForm();
  const create = useCreateForm();
  const editor = useFormEditor(selected?.id ?? "");
  const preview = useFormEditor(previewing?.id ?? "");
  const publish = useFormLifecycle("publish");
  const retire = useFormLifecycle("retire");
  const update = useUpdateForm(selected?.id ?? "");
  const closeEdit = () => setSelected(undefined);
  let pendingAction: FormTablePendingAction | undefined;
  if (preview.isPending && previewing) {
    pendingAction = { action: "preview", definitionId: previewing.id };
  } else if (publish.isPending && publish.variables) {
    pendingAction = {
      action: "publish",
      definitionId: publish.variables.definitionId,
    };
  } else if (retire.isPending && retire.variables) {
    pendingAction = {
      action: "retire",
      definitionId: retire.variables.definitionId,
    };
  } else if (clone.isPending && clone.variables) {
    pendingAction = {
      action: "clone",
      definitionId: clone.variables.definitionId,
    };
  }
  const actionError = preview.error?.message
    ?? publish.error?.message
    ?? retire.error?.message
    ?? clone.error?.message;

  function runLifecycle(
    action: typeof publish,
    form: FormDefinitionSummary,
  ) {
    if (!form.latestVersionId || form.latestVersionRowVersion === null) return;
    setPreviewing(undefined);
    clone.reset();
    publish.reset();
    retire.reset();
    action.mutate({
      definitionId: form.id,
      expectedRowVersion: form.latestVersionRowVersion,
      versionId: form.latestVersionId,
    });
  }

  return (
    <>
      <FormsTable
        canCreate={canCreate}
        canPublish={canPublish}
        canRetire={canRetire}
        canUpdate={canUpdate}
        emptyMessage={
          query.isPending
            ? "Loading forms…"
            : query.error?.message ?? "No forms have been configured."
        }
        errorMessage={actionError}
        items={query.data?.items ?? []}
        loading={query.isFetching}
        onClone={(form) => {
          if (!form.latestVersionId) return;
          setPreviewing(undefined);
          publish.reset();
          retire.reset();
          clone.mutate({
            definitionId: form.id,
            sourceVersionId: form.latestVersionId,
          }, {
            onSuccess: () => setSelected(form),
          });
        }}
        onCreate={() => setCreating(true)}
        onEdit={setSelected}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        onPreview={(form) => {
          clone.reset();
          publish.reset();
          retire.reset();
          setPreviewing(form);
        }}
        onPublish={(form) => runLifecycle(publish, form)}
        onRetire={(form) => runLifecycle(retire, form)}
        page={query.data?.page ?? page}
        pageSize={query.data?.pageSize ?? pageSize}
        pendingAction={pendingAction}
        total={query.data?.total ?? 0}
        totalPages={query.data?.totalPages ?? 0}
      />
      {preview.data ? (
        <FormPreviewDialog
          editor={preview.data}
          isOpen={Boolean(previewing)}
          onClose={() => setPreviewing(undefined)}
        />
      ) : null}
      <DraggableDialog
        isOpen={creating && canCreate}
        onClose={() => setCreating(false)}
        title="Create form"
      >
        <FormDefinitionDialogForm
          mode="create"
          mutation={create}
          onCompleted={() => setCreating(false)}
        />
      </DraggableDialog>
      <DraggableDialog
        isOpen={Boolean(selected) && canUpdate}
        onClose={closeEdit}
        title="Edit form"
      >
        {editor.isPending ? <p>Loading form…</p> : null}
        {editor.error ? (
          <p className="text-sm text-red-700" role="alert">
            {editor.error.message}
          </p>
        ) : null}
        {editor.data ? (
          <FormDefinitionDialogForm
            editor={editor.data}
            key={`${editor.data.definition.id}-${editor.data.version.rowVersion}`}
            mode="edit"
            mutation={update}
            onCompleted={closeEdit}
          />
        ) : null}
      </DraggableDialog>
    </>
  );
}
