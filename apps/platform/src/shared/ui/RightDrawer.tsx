"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { GeneralButton, IconButton } from "./Button";

type DrawerSize = "md" | "lg" | "xl";

type RightDrawerProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  headerActions?: ReactNode;
  onClose: () => void;
  open: boolean;
  presentation?: "drawer" | "floating";
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
    panelRef.current
      ?.querySelector<HTMLButtonElement>("[data-panel-close]")
      ?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !panelRef.current) return;
      const candidates = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      const focusable = [...candidates].filter((element) => {
        const collapsed = element.closest("details:not([open])");
        return !collapsed || element === collapsed.querySelector("summary");
      });
      const first = focusable.at(0);
      const last = focusable.at(-1);
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
  }, [panelRef, rendered]);
}

export function RightDrawer({
  children,
  description,
  footer,
  headerActions,
  onClose,
  open,
  presentation = "drawer",
  size = "lg",
  title,
  titleIcon,
}: RightDrawerProps) {
  const { rendered, visible } = useDrawerPresence(open);
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const floating = presentation === "floating";
  useDrawerLifecycle(rendered, onClose, panelRef);

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100">
      <GeneralButton
        aria-label={floating ? "Close chat" : "Close drawer"}
        className={cn(
          "absolute inset-0 h-full w-full rounded-none bg-brand-navy/30 transition-opacity duration-200 hover:bg-brand-navy/30 focus-visible:ring-0",
          floating && "bg-transparent hover:bg-transparent",
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
          "absolute right-0 flex flex-col bg-white shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none",
          floating
            ? "right-3 bottom-3 h-[min(38rem,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-brand-navy/10 sm:right-6 sm:bottom-6 sm:w-[25rem]"
            : "inset-y-0 w-[min(100vw,42rem)]",
          sizeClasses[size],
          visible ? "translate-x-0" : "translate-x-full",
        )}
        ref={panelRef}
        role="dialog"
      >
        <header
          className={cn(
            "shrink-0 border-b border-brand-navy/10",
            floating ? "px-4 py-4" : "px-5 py-5 sm:px-7",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {titleIcon}
              <div className="min-w-0">
                <h2
                  className={cn(
                    "font-bold text-brand-navy",
                    floating ? "text-base" : "text-xl",
                  )}
                  id={titleId}
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    className={cn(
                      "mt-1 leading-5 text-brand-navy/65",
                      floating ? "text-xs" : "text-sm",
                    )}
                    id={descriptionId}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              <IconButton
                label={floating ? "Close chat" : "Close drawer"}
                title={floating ? "Close chat" : "Close drawer"}
                data-panel-close
                variant="ghost"
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-5" />
              </IconButton>
            </div>
          </div>
        </header>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            floating ? "px-5 py-5" : "px-5 py-6 sm:px-7",
          )}
        >
          {children}
        </div>
        {footer ? (
          <footer
            className={cn(
              "shrink-0 border-t border-brand-navy/10 bg-white",
              floating
                ? "max-h-[60%] overflow-y-auto px-4 py-3"
                : "px-5 py-4 sm:px-7",
            )}
          >
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
