"use client";

import { useFormEditorController } from "./FormEditorController";
import { FormEditorMutationError } from "./FormEditorLifecycleActions";
import { FormEditorBody } from "./FormEditorBody";
import { FormEditorTopSection } from "./FormEditorTopSection";

type FormEditorController = ReturnType<typeof useFormEditorController>;

function FormEditorTopContent({
  canPublish,
  canRetire,
  canUpdate,
  controller,
  editor,
  id,
  isDraft,
  isPublished,
  pending,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  controller: FormEditorController;
  editor: NonNullable<FormEditorController["editor"]>;
  id: string;
  isDraft: boolean;
  isPublished: boolean;
  pending: boolean;
}) {
  const error = controller.update.error?.message
    ?? controller.publish.error?.message
    ?? controller.retire.error?.message
    ?? controller.clone.error?.message;
  return (
    <>
      <FormEditorTopSection
        canPublish={canPublish}
        canRetire={canRetire}
        canUpdate={canUpdate}
        editor={editor}
        isDraft={isDraft}
        isPublished={isPublished}
        onAddField={controller.openNewField}
        onClone={() => controller.clone.mutate(editor.version.id)}
        onPublish={() => controller.publish.mutate({
          definitionId: id,
          expectedRowVersion: editor.version.rowVersion,
          versionId: editor.version.id,
        })}
        onRetire={() => controller.retire.mutate({
          definitionId: id,
          expectedRowVersion: editor.version.rowVersion,
          versionId: editor.version.id,
        })}
        pending={pending}
      />
      <FormEditorMutationError message={error} />
    </>
  );
}

function LoadedFormEditorWorkspace({
  canPublish,
  canRetire,
  canUpdate,
  controller,
  id,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  controller: FormEditorController;
  id: string;
}) {
  const editor = controller.editor;
  if (!editor) return null;
  const isDraft = editor.version.status === "DRAFT";
  const isPublished = editor.version.status === "PUBLISHED";
  const canEdit = canUpdate && isDraft;
  const pending = controller.update.isPending
    || controller.publish.isPending
    || controller.retire.isPending
    || controller.clone.isPending;
  return (
    <div className="space-y-6">
      <FormEditorTopContent
        canPublish={canPublish}
        canRetire={canRetire}
        canUpdate={canUpdate}
        controller={controller}
        editor={editor}
        id={id}
        isDraft={isDraft}
        isPublished={isPublished}
        pending={pending}
      />
      <FormEditorBody
        canEdit={canEdit}
        dialogOpen={controller.dialogOpen}
        field={controller.field}
        fieldToRemove={controller.fieldToRemove}
        fields={editor.fields}
        isPending={controller.update.isPending}
        onCancelDelete={() => controller.setFieldToRemove(undefined)}
        onCloseDialog={() => controller.setDialogOpen(false)}
        onConfirmDelete={controller.removeField}
        onDelete={controller.setFieldToRemove}
        onEdit={controller.openExistingField}
        onSave={controller.saveField}
        versions={editor.versions}
      />
    </div>
  );
}

export function FormEditorWorkspace({
  canPublish,
  canRetire,
  canUpdate,
  id,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  id: string;
}) {
  const controller = useFormEditorController(id);
  const { query } = controller;
  if (query.isPending) return <p>Loading form…</p>;
  if (query.isError || !controller.editor) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error?.message ?? "Form unavailable."}
      </p>
    );
  }
  return (
    <LoadedFormEditorWorkspace
      canPublish={canPublish}
      canRetire={canRetire}
      canUpdate={canUpdate}
      controller={controller}
      id={id}
    />
  );
}
