"use client";

import { useRef, useState, type PointerEvent, type KeyboardEvent } from "react";

const minimumZoom = 0.1;
const maximumZoom = 2;

type View = { zoom: number; x: number; y: number };
type Pan = { pointerId: number; x: number; y: number; origin: View };

export function useWorkflowGraphViewport(width: number, height: number) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pan = useRef<Pan | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  function zoomBy(factor: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
    const centerY = viewport.scrollTop + viewport.clientHeight / 2;
    setView((current) => {
      const zoom = Math.min(
        maximumZoom,
        Math.max(minimumZoom, current.zoom * factor),
      );
      const ratio = zoom / current.zoom;
      return {
        zoom,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      };
    });
  }

  function reset() {
    setView({ zoom: 1, x: 0, y: 0 });
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  }

  function fit() {
    const viewport = viewportRef.current;
    if (!viewport || !viewport.clientWidth || !viewport.clientHeight) return;
    const zoom = Math.min(
      maximumZoom,
      Math.max(
        minimumZoom,
        Math.min(
          (viewport.clientWidth - 32) / width,
          (viewport.clientHeight - 32) / height,
        ),
      ),
    );
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
    setView({
      zoom,
      x: (viewport.clientWidth - width * zoom) / 2,
      y: (viewport.clientHeight - height * zoom) / 2,
    });
  }

  function startPanning(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    const target = event.target as Element;
    if (
      target.closest(
        "[data-workflow-stage], [data-workflow-route], button, a, input, select, textarea",
      )
    )
      return;
    pan.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: view,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setIsPanning(true);
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    const current = pan.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setView({
      ...current.origin,
      x: current.origin.x + event.clientX - current.x,
      y: current.origin.y + event.clientY - current.y,
    });
  }

  function stopPanning(event: PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointerId !== event.pointerId) return;
    pan.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-40, 0],
      ArrowRight: [40, 0],
      ArrowUp: [0, -40],
      ArrowDown: [0, 40],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    setView((current) => ({
      ...current,
      x: current.x + direction[0],
      y: current.y + direction[1],
    }));
  }

  return {
    view,
    viewportRef,
    isPanning,
    zoomIn: () => zoomBy(1.2),
    zoomOut: () => zoomBy(1 / 1.2),
    canZoomIn: view.zoom < maximumZoom,
    canZoomOut: view.zoom > minimumZoom,
    reset,
    fit,
    handlers: {
      onPointerDown: startPanning,
      onPointerMove: movePan,
      onPointerUp: stopPanning,
      onPointerCancel: stopPanning,
      onLostPointerCapture: stopPanning,
      onKeyDown,
    },
  };
}
