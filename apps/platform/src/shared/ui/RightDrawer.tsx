"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type DrawerSize = "md" | "lg" | "xl";

type RightDrawerProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: DrawerSize;
  title: string;
  titleIcon?: ReactNode;
};

const sizeClasses: Record<DrawerSize, string> = {
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

function useDrawerPresence(open: boolean) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(open));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return { rendered: open, visible };
}

function useDrawerLifecycle(
  rendered: boolean,
  onClose: () => void,
  closeRef: React.RefObject<HTMLButtonElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!rendered) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (event.shiftKey && document.activeElement === first) last?.focus();
      else if (!event.shiftKey && document.activeElement === last)
        first?.focus();
      else return;
      event.preventDefault();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [closeRef, panelRef, rendered]);
}

export function RightDrawer({
  children,
  description,
  footer,
  onClose,
  open,
  size = "lg",
  title,
  titleIcon,
}: RightDrawerProps) {
  const { rendered, visible } = useDrawerPresence(open);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useDrawerLifecycle(rendered, onClose, closeRef, panelRef);

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100">
      <button
        aria-label="Close drawer"
        className={cn(
          "absolute inset-0 bg-brand-navy/30 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(100vw,42rem)] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none",
          sizeClasses[size],
          visible ? "translate-x-0" : "translate-x-full",
        )}
        ref={panelRef}
        role="dialog"
      >
        <header className="border-b border-brand-navy/10 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {titleIcon}
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-brand-navy" id={titleId}>
                  {title}
                </h2>
                {description ? (
                  <p
                    className="mt-1 text-sm leading-5 text-brand-navy/65"
                    id={descriptionId}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              aria-label="Close drawer"
              className="grid size-10 shrink-0 place-items-center rounded-full text-brand-navy transition hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              onClick={onClose}
              ref={closeRef}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {children}
        </div>
        {footer ? (
          <footer className="border-t border-brand-navy/10 bg-white px-5 py-4 sm:px-7">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
