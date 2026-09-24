"use client";

import { GeneralButton } from "@/components/ui/button";

export function FormEditorLifecycleActions({
  canPublish,
  canRetire,
  canUpdate,
  clonePending,
  isDraft,
  isPublished,
  onClone,
  onPreview,
  onPublish,
  onRetire,
  publishPending,
  retirePending,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  clonePending: boolean;
  isDraft: boolean;
  isPublished: boolean;
  onClone: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onRetire: () => void;
  publishPending: boolean;
  retirePending: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <GeneralButton
        onClick={onPreview}
        size="compact"
        type="button"
        variant="outline"
      >
        Preview
      </GeneralButton>
      <GeneralButton
        disabled={!canPublish || !isDraft || publishPending}
        onClick={onPublish}
        size={"compact"}
        type="button"
      >
        {publishPending ? "Publishing…" : "Publish"}
      </GeneralButton>
      <GeneralButton
        size={"compact"}
        disabled={!canRetire || !isPublished || retirePending}
        onClick={onRetire}
        type="button"
        variant="outline"
      >
        {retirePending ? "Retiring…" : "Retire"}
      </GeneralButton>
      <GeneralButton
        size={"compact"}
        disabled={!canUpdate || isDraft || clonePending}
        onClick={onClone}
        type="button"
        variant="outline"
      >
        {clonePending ? "Creating…" : "Create new draft"}
      </GeneralButton>
    </div>
  );
}

export function FormEditorMutationError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
      {message}
    </p>
  );
}
