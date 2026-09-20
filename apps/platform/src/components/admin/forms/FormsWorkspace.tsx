"use client";

import { useState } from "react";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import {
  useCreateForm,
  useFormEditor,
  useForms,
  useUpdateForm,
} from "@/modules/forms/FormHooks";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import { FormDefinitionDialogForm } from "./FormDefinitionDialogForm";
import { FormsTable } from "./FormsTable";

export function FormsWorkspace({
  canCreate,
  canUpdate,
}: {
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<FormDefinitionSummary>();
  const query = useForms({ page, pageSize });
  const create = useCreateForm();
  const editor = useFormEditor(selected?.id ?? "");
  const update = useUpdateForm(selected?.id ?? "");
  const closeEdit = () => setSelected(undefined);
  return (
    <>
      <FormsTable
        canCreate={canCreate}
        canUpdate={canUpdate}
        emptyMessage={
          query.isPending
            ? "Loading forms…"
            : query.error?.message ?? "No forms have been configured."
        }
        items={query.data?.items ?? []}
        loading={query.isFetching}
        onCreate={() => setCreating(true)}
        onEdit={setSelected}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        page={query.data?.page ?? page}
        pageSize={query.data?.pageSize ?? pageSize}
        total={query.data?.total ?? 0}
        totalPages={query.data?.totalPages ?? 0}
      />
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
