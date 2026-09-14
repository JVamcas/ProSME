"use client";

import type { ReactNode } from "react";

import { GeneralButton } from "./button";
import { DraggableDialog } from "./draggable-dialog";

type Props = {
  cancelText?: string;
  confirmText?: string;
  errorMessage?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  isOpen: boolean;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmationDialog({
  cancelText = "Cancel",
  confirmText = "Confirm",
  errorMessage,
  isDangerous = false,
  isLoading = false,
  isOpen,
  message,
  onCancel,
  onConfirm,
  title,
}: Props) {
  return (
    <DraggableDialog isOpen={isOpen} onClose={onCancel} size="sm" title={title}>
      <div className="space-y-6">
        <div className="text-sm leading-6 text-brand-navy/70">{message}</div>
        {errorMessage ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <GeneralButton
            disabled={isLoading}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            {cancelText}
          </GeneralButton>
          <GeneralButton
            disabled={isLoading}
            onClick={onConfirm}
            type="button"
            variant={isDangerous ? "danger" : "default"}
          >
            {isLoading ? "Deleting…" : confirmText}
          </GeneralButton>
        </div>
      </div>
    </DraggableDialog>
  );
}
