"use client";

import { Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useId, type ReactNode } from "react";

import { IconButton } from "@/components/ui/button";
import { useWorkflowGraphViewport } from "./useWorkflowGraphViewport";

export function WorkflowGraphViewport({
  children,
  width,
  height,
  className,
  label = "Workflow visual flow",
}: {
  children: ReactNode;
  width: number;
  height: number;
  className?: string;
  label?: string;
}) {
  const helpId = useId();
  const {
    view,
    viewportRef,
    isPanning,
    handlers,
    zoomIn,
    zoomOut,
    canZoomIn,
    canZoomOut,
    fit,
    reset,
  } = useWorkflowGraphViewport(width, height);

  return (
    <div className="min-w-0 max-w-full border-t border-brand-navy/10 bg-brand-cream/35">
      <p className="px-3 pt-3 text-xs text-brand-navy/70 sm:px-5">
        <span className="font-semibold text-violet-900">Violet highlights</span>
        {" mark terminal actions that end the application's active workflow."}
      </p>
      <div
        {...handlers}
        aria-describedby={helpId}
        aria-label={label}
        className={`min-w-0 max-w-full touch-none overflow-auto overscroll-contain ${isPanning ? "cursor-grabbing select-none" : "cursor-grab"} ${className ?? "max-h-[560px]"}`}
        ref={viewportRef}
        style={{ height: Math.min(height, 560) }}
        role="region"
        tabIndex={0}
      >
        <div
          className="relative"
          style={{ width: width * view.zoom, height: height * view.zoom }}
        >
          <div
            data-workflow-canvas=""
            style={{
              width,
              height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
        <p id={helpId} className="text-xs text-brand-navy/60">
          Drag the background to move the flow. Use arrow keys when the canvas
          is focused.
        </p>
        <div
          aria-label="Flow view controls"
          className="flex items-center gap-1"
          role="group"
        >
          <IconButton
            compact
            variant="outline"
            label="Zoom out"
            title="Zoom out"
            onClick={zoomOut}
            disabled={!canZoomOut}
          >
            <ZoomOut aria-hidden="true" className="size-4" />
          </IconButton>
          <span
            aria-live="polite"
            className="min-w-12 text-center text-xs font-semibold text-brand-navy"
          >
            {Math.round(view.zoom * 100)}%
          </span>
          <IconButton
            compact
            variant="outline"
            label="Zoom in"
            title="Zoom in"
            onClick={zoomIn}
            disabled={!canZoomIn}
          >
            <ZoomIn aria-hidden="true" className="size-4" />
          </IconButton>
          <IconButton
            compact
            variant="outline"
            label="Fit flow to view"
            title="Fit flow to view"
            onClick={fit}
          >
            <Maximize aria-hidden="true" className="size-4" />
          </IconButton>
          <IconButton
            compact
            variant="outline"
            label="Reset flow view"
            title="Reset flow view"
            onClick={reset}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
