"use client";

import type { FormVersionSummary } from "@/modules/forms/FormTypes";
import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";

export type FormVersionPendingAction = {
  action: "clone" | "preview" | "publish" | "retire";
  versionId: string;
};

export type FormVersionActionOptions = {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  onClone: (version: FormVersionSummary) => void;
  onPreview: (version: FormVersionSummary) => void;
  onPublish: (version: FormVersionSummary) => void;
  onRetire: (version: FormVersionSummary) => void;
  pendingAction?: FormVersionPendingAction;
};

export function FormVersionActions({
  version,
  options,
}: {
  version: FormVersionSummary;
  options: FormVersionActionOptions;
}) {
  const pending =
    options.pendingAction?.versionId === version.id
      ? options.pendingAction.action
      : undefined;
  const actionPending = Boolean(options.pendingAction);
  const items: ActionMenuItem[] = [
    {
      id: "preview",
      label: pending === "preview" ? "Previewing…" : "Preview",
      disabled: actionPending,
      onAction: () => options.onPreview(version),
    },
    {
      id: "publish",
      label: pending === "publish" ? "Publishing…" : "Publish",
      disabled:
        !options.canPublish || version.status !== "DRAFT" || actionPending,
      onAction: () => options.onPublish(version),
    },
    {
      id: "retire",
      label: pending === "retire" ? "Retiring…" : "Retire",
      disabled:
        !options.canRetire || version.status !== "PUBLISHED" || actionPending,
      destructive: true,
      onAction: () => options.onRetire(version),
    },
    {
      id: "clone",
      label: pending === "clone" ? "Cloning…" : "Clone",
      disabled:
        !options.canUpdate || version.status === "DRAFT" || actionPending,
      onAction: () => options.onClone(version),
    },
  ];
  return (
    <ActionMenu
      items={items}
      label={`Actions for version ${version.versionNumber}`}
    />
  );
}
