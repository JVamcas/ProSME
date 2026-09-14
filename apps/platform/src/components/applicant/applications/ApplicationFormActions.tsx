import { ArrowRight, Cloud, LoaderCircle, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

function saveLabel(input: {
  dirty: boolean;
  error: boolean;
  online: boolean;
  pending: boolean;
}) {
  if (!input.online) return "Offline — changes will save after reconnecting";
  if (input.pending) return "Saving…";
  if (input.error) return "Save failed — retry available";
  return input.dirty ? "Autosave pending" : "Draft saved";
}

export function ApplicationFormActions({
  dirty,
  error,
  online,
  pending,
  onSave,
}: {
  dirty: boolean;
  error: boolean;
  online: boolean;
  pending: boolean;
  onSave: () => void;
}) {
  const StateIcon = online ? Cloud : WifiOff;
  return (
    <div className="mt-7 flex flex-col-reverse gap-3 border-t border-brand-navy/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="flex items-center gap-2 text-xs text-brand-navy/60"
        aria-live="polite"
      >
        <StateIcon aria-hidden="true" className="size-4 text-brand-orange" />
        {saveLabel({ dirty, error, online, pending })}
      </div>
      <div className="flex gap-3">
        <Button
          disabled={pending || !online}
          onClick={onSave}
          type="button"
          variant="outline"
        >
          {error ? "Retry save" : "Save draft"}
        </Button>
        <Button disabled={pending || !online} type="submit" variant="brand">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Save and continue
          {!pending ? (
            <ArrowRight aria-hidden="true" className="size-4" />
          ) : null}
        </Button>
      </div>
    </div>
  );
}
