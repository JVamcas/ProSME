"use client";

import type { ReactNode } from "react";

import { GeneralButton, type ButtonProps } from "./button";
import { DraggableDialog, type DialogSize } from "./draggable-dialog";

type Props = {
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: ButtonProps["variant"];
  errorMessage?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  isOpen: boolean;
  loadingText?: string;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  size?: DialogSize;
  title: string;
};

export function ConfirmationDialog({
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmVariant,
  errorMessage,
  isDangerous = false,
  isLoading = false,
  isOpen,
  loadingText = "Working…",
  message,
  onCancel,
  onConfirm,
  size = "sm",
  title,
}: Props) {
  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onCancel}
      size={size}
      title={title}
    >
      <div className="space-y-6">
        <div className="text-sm leading-6 text-brand-navy/70">{message}</div>
        {errorMessage ? (
          <p
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
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
            variant={confirmVariant ?? (isDangerous ? "danger" : "primary")}
          >
            {isLoading ? loadingText : confirmText}
          </GeneralButton>
        </div>
      </div>
    </DraggableDialog>
  );
}
