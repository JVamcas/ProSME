"use client";

import { GeneralButton } from "@/components/ui/button";

export function FormEditorLifecycleActions({
  canPublish,
  canRetire,
  canUpdate,
  isDraft,
  isPublished,
  onClone,
  onPublish,
  onRetire,
  pending,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  isDraft: boolean;
  isPublished: boolean;
  onClone: () => void;
  onPublish: () => void;
  onRetire: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <GeneralButton
        disabled={!canPublish || !isDraft || pending}
        onClick={onPublish}
        type="button"
      >
        {pending ? "Working…" : "Publish"}
      </GeneralButton>
      <GeneralButton
        disabled={!canRetire || !isPublished || pending}
        onClick={onRetire}
        type="button"
        variant="outline"
      >
        Retire
      </GeneralButton>
      <GeneralButton
        disabled={!canUpdate || isDraft || pending}
        onClick={onClone}
        type="button"
        variant="outline"
      >
        Create new draft
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
