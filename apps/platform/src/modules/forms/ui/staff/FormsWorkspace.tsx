"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formListSchema } from "@/modules/forms/api/FormSchemas";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import {
  useCreateForm,
  useFormEditor,
  useForms,
  useUpdateForm,
} from "@/modules/forms/FormHooks";
import type { FormDefinitionSummary } from "@/modules/forms/FormTypes";
import type { FormListInput } from "@/modules/forms/api/FormTransportTypes";
import { FormPreviewDialog } from "@/modules/forms/ui/renderer/FormPreviewDialog";
import { FormsSearchForm } from "./FormsSearchForm";
import { FormDefinitionDialogForm } from "./FormDefinitionDialogForm";
import { FormsTable } from "./FormsTable";
import { useFormVersionActions } from "./useFormVersionActions";

const searchSchema = formListSchema.pick({ search: true });

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
  const [search, setSearch] = useState("");
  const searchForm = useForm({
    defaultValues: { search: "" },
    resolver: zodResolver(searchSchema),
  });
  const [selected, setSelected] = useState<FormDefinitionSummary>();
  const query = useForms({ page, pageSize, search: search || undefined });
  const versionActions = useFormVersionActions();
  const create = useCreateForm();
  const editor = useFormEditor(selected?.id ?? "");
  const update = useUpdateForm(selected?.id ?? "");
  const closeEdit = () => setSelected(undefined);
  const applySearch = (values: Pick<FormListInput, "search">) => {
    setSearch(values.search ?? "");
    setPage(1);
  };
  const clearSearch = () => {
    searchForm.reset({ search: "" });
    setSearch("");
    setPage(1);
  };
  let emptyMessage = "No forms have been configured.";
  if (query.isPending) {
    emptyMessage = "Loading forms…";
  } else if (query.error) {
    emptyMessage = query.error.message;
  } else if (search) {
    emptyMessage = "No forms match your search.";
  }

  return (
    <>
      <FormsTable
        canCreate={canCreate}
        canPublish={canPublish}
        canRetire={canRetire}
        canUpdate={canUpdate}
        emptyMessage={emptyMessage}
        errorMessage={versionActions.errorMessage}
        items={query.data?.items ?? []}
        loading={query.isFetching}
        onClone={versionActions.onClone}
        onCreate={() => setCreating(true)}
        onEdit={setSelected}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        onPreview={versionActions.onPreview}
        onPublish={versionActions.onPublish}
        onRetire={versionActions.onRetire}
        page={query.data?.page ?? page}
        pageSize={query.data?.pageSize ?? pageSize}
        pendingAction={versionActions.pendingAction}
        searchForm={
          <FormsSearchForm
            form={searchForm}
            onClear={clearSearch}
            onSearch={applySearch}
          />
        }
        total={query.data?.total ?? 0}
        totalPages={query.data?.totalPages ?? 0}
      />
      {versionActions.preview ? (
        <FormPreviewDialog
          editor={versionActions.preview}
          isOpen
          onClose={versionActions.closePreview}
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
