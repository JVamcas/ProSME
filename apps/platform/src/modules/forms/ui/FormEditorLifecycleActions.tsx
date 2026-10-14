"use client";

import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";

export function FormEditorLifecycleActions({
  canPublish,
  canRetire,
  canUpdate,
  clonePending,
  isDraft,
  isPublished,
  onClone,
  onEdit,
  onPreview,
  onPublish,
  onRetire,
  publishPending,
  retirePending,
  updatePending,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  clonePending: boolean;
  isDraft: boolean;
  isPublished: boolean;
  onClone: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onRetire: () => void;
  publishPending: boolean;
  retirePending: boolean;
  updatePending: boolean;
}) {
  const items: ActionMenuItem[] = [
    {
      id: "preview",
      label: "Preview",
      onAction: onPreview,
    },
    {
      id: "edit",
      label: updatePending ? "Saving…" : "Edit",
      disabled: !canUpdate || !isDraft || updatePending,
      onAction: onEdit,
    },
    {
      id: "publish",
      label: publishPending ? "Publishing…" : "Publish",
      disabled: !canPublish || !isDraft || publishPending,
      onAction: onPublish,
    },
    {
      id: "retire",
      label: retirePending ? "Retiring…" : "Retire",
      disabled: !canRetire || !isPublished || retirePending,
      destructive: true,
      onAction: onRetire,
    },
    {
      id: "clone",
      label: clonePending ? "Creating…" : "Create new draft",
      disabled: !canUpdate || isDraft || clonePending,
      onAction: onClone,
    },
  ];
  return <ActionMenu items={items} label="Form actions" />;
}

export function FormEditorMutationError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
      {message}
    </p>
  );
}
