"use client";

import { X } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl";

type Props = {
  children: ReactNode;
  contentClassName?: string;
  isOpen: boolean;
  onClose: () => void;
  panelClassName?: string;
  size?: DialogSize;
  title: string;
};

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function DraggableDialog({ isOpen, ...props }: Props) {
  return isOpen ? <DraggableDialogPanel {...props} /> : null;
}

function DraggableDialogPanel({
  children,
  contentClassName,
  onClose,
  panelClassName,
  size = "lg",
  title,
}: Omit<Props, "isOpen">) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useDialogLifecycle(onClose, closeRef, panelRef);

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || event.currentTarget !== event.target) return;
    if (event.pointerType === "touch" && window.innerWidth < 640) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function moveDialog(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  }

  function stopDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-brand-navy/10 p-2 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-[0_16px_40px_-24px_rgba(10,24,59,0.28)] sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl",
          sizeClasses[size],
          panelClassName,
        )}
        ref={panelRef}
        role="dialog"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <header
          className="flex cursor-grab touch-none select-none items-center justify-between rounded-xl border-b border-t-2 border-slate-100 border-t-brand-orange px-5 py-4 active:cursor-grabbing sm:px-6"
          onPointerCancel={stopDrag}
          onPointerDown={startDrag}
          onPointerMove={moveDialog}
          onPointerUp={stopDrag}
        >
          <h2
            className="pointer-events-none text-xl font-bold text-brand-navy"
            id={titleId}
          >
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            className="grid size-9 place-items-center rounded-full text-brand-navy transition hover:bg-brand-cream hover:text-brand-navy"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <X className="size-5" />
          </button>
        </header>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-5 sm:p-6",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined"
    ? null
    : createPortal(dialog, document.body);
}

function useDialogLifecycle(
  onClose: () => void,
  closeRef: React.RefObject<HTMLButtonElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (event.shiftKey && document.activeElement === first) last?.focus();
      else if (!event.shiftKey && document.activeElement === last) first?.focus();
      else return;
      event.preventDefault();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [closeRef, onClose, panelRef]);
}
