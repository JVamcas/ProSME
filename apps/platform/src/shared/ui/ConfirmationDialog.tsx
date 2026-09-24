"use client";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";

type Props = {
  confirmLabel?: string;
  isOpen: boolean;
  isPending?: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  pendingLabel?: string;
  title: string;
};

export function ConfirmationDialog({
  confirmLabel = "Confirm",
  isOpen,
  isPending = false,
  message,
  onClose,
  onConfirm,
  pendingLabel = "Processing…",
  title,
}: Props) {
  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      size="sm"
      title={title}
    >
      <p className="text-sm text-brand-navy/75">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <GeneralButton
          disabled={isPending}
          onClick={onClose}
          variant="outline"
        >
          Cancel
        </GeneralButton>
        <GeneralButton
          disabled={isPending}
          onClick={onConfirm}
          variant="danger"
        >
          {isPending ? pendingLabel : confirmLabel}
        </GeneralButton>
      </div>
    </DraggableDialog>
  );
}
