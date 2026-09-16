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
  const [selected, setSelected] = useState<FormDefinitionSummary>();
  const query = useForms();
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
        items={query.data ?? []}
        onCreate={() => setCreating(true)}
        onEdit={setSelected}
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
