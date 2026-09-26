"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

import { GeneralButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FileUploadButtonProps = {
  accept?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  onFile: (file: File) => void;
  uploading?: boolean;
  variant?: "default" | "compact";
};

export function FileUploadButton({
  accept,
  className,
  disabled = false,
  label = "Upload",
  onFile,
  uploading = false,
  variant = "default",
}: FileUploadButtonProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const inactive = disabled || uploading;

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (inactive || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (inactive || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (inactive) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (inactive) return;
    const file = event.dataTransfer.files.item(0);
    if (file) onFile(file);
  }

  return (
    <div
      className={cn(
        "flex min-h-16 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-dashed border-brand-navy/25 px-3 py-2",
        variant === "compact" && "min-h-9 gap-x-2 px-2 py-1",
        dragging && "border-brand-orange bg-brand-orange/5",
        inactive && "opacity-50",
        className,
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        accept={accept}
        aria-label={label}
        className="sr-only"
        disabled={inactive}
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) onFile(file);
          event.target.value = "";
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <GeneralButton
        disabled={inactive}
        onClick={() => inputRef.current?.click()}
        size={variant === "compact" ? "compact" : "sm"}
        type="button"
        variant="outline"
      >
        {uploading ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Upload aria-hidden="true" className="size-4" />
        )}
        {label}
      </GeneralButton>
      <span
        className={cn(
          "text-xs text-brand-navy/60",
          variant === "compact" && "sr-only",
        )}
      >
        or drop a file here
      </span>
    </div>
  );
}
