"use client";

import {
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export type InfoTooltipSide = "top" | "right" | "bottom" | "left";

type Props = {
  children?: ReactNode;
  content: ReactNode;
  side?: InfoTooltipSide;
};

const viewportPadding = 8;
const triggerGap = 8;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function fallbackSide(side: InfoTooltipSide): InfoTooltipSide {
  if (side === "top") return "bottom";
  if (side === "right") return "left";
  if (side === "bottom") return "top";
  return "right";
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

export function InfoTooltip({ children, content, side = "top" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedSide, setResolvedSide] = useState<InfoTooltipSide>(side);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({
    left: 0,
    opacity: 0,
    top: 0,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const canUsePortal = typeof document !== "undefined";

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("mousedown", closeOutside);
    window.addEventListener("touchstart", closeOutside);
    return () => {
      window.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("touchstart", closeOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!canUsePortal || !isOpen || !buttonRef.current || !tooltipRef.current) {
      return undefined;
    }

    const updatePosition = () => {
      const trigger = buttonRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const space = {
        top: trigger.top - viewportPadding,
        right: window.innerWidth - trigger.right - viewportPadding,
        bottom: window.innerHeight - trigger.bottom - viewportPadding,
        left: trigger.left - viewportPadding,
      };
      const vertical = side === "top" || side === "bottom";
      const preferredSize =
        (vertical ? tooltipRect.height : tooltipRect.width) + triggerGap;
      let nextSide = side;

      if (space[side] < preferredSize) {
        const fallback = fallbackSide(side);
        if (space[fallback] > space[side]) nextSide = fallback;
      }

      let top = 0;
      let left = 0;
      if (nextSide === "top") {
        top = trigger.top - tooltipRect.height - triggerGap;
        left = trigger.left + trigger.width / 2 - tooltipRect.width / 2;
      } else if (nextSide === "right") {
        top = trigger.top + trigger.height / 2 - tooltipRect.height / 2;
        left = trigger.right + triggerGap;
      } else if (nextSide === "bottom") {
        top = trigger.bottom + triggerGap;
        left = trigger.left + trigger.width / 2 - tooltipRect.width / 2;
      } else {
        top = trigger.top + trigger.height / 2 - tooltipRect.height / 2;
        left = trigger.left - tooltipRect.width - triggerGap;
      }

      setResolvedSide(nextSide);
      setTooltipStyle({
        left: clamp(
          left,
          viewportPadding,
          Math.max(
            viewportPadding,
            window.innerWidth - tooltipRect.width - viewportPadding,
          ),
        ),
        opacity: 1,
        top: clamp(
          top,
          viewportPadding,
          Math.max(
            viewportPadding,
            window.innerHeight - tooltipRect.height - viewportPadding,
          ),
        ),
      });
    };

    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updatePosition);
    observer?.observe(buttonRef.current);
    observer?.observe(tooltipRef.current);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer?.disconnect();
    };
  }, [canUsePortal, content, isOpen, side]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && rootRef.current?.contains(nextTarget)) {
      return;
    }
    setIsOpen(false);
  };

  const tooltip = canUsePortal
    ? createPortal(
        <div
          aria-hidden={!isOpen}
          className={cn(
            "pointer-events-none fixed z-[300] w-64 max-w-[calc(100vw-1rem)] rounded-xl bg-brand-navy px-3 py-2 text-sm text-white shadow-xl transition",
            isOpen ? "visible opacity-100" : "invisible opacity-0",
          )}
          data-side={resolvedSide}
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          style={tooltipStyle}
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        className="inline-flex items-center gap-1"
        onBlurCapture={handleBlur}
        onFocusCapture={() => setIsOpen(true)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        ref={rootRef}
      >
        {children}
        <button
          aria-describedby={isOpen ? tooltipId : undefined}
          aria-label="More information"
          className="inline-flex size-6 items-center justify-center rounded-full border border-brand-navy/15 bg-white text-brand-navy/55 transition hover:border-brand-navy/30 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue"
          onClick={() => setIsOpen((open) => !open)}
          ref={buttonRef}
          type="button"
        >
          <InfoIcon />
        </button>
      </div>
      {tooltip}
    </>
  );
}
