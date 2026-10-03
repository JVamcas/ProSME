"use client";

import { useRef, useState, type PointerEvent } from "react";

import {
  workflowGraphMetrics,
  type WorkflowNodePosition,
} from "./WorkflowGraphLayout";

type DragState = {
  code: string;
  scale: number;
  origin: WorkflowNodePosition;
  pointerX: number;
  pointerY: number;
};

export function useWorkflowGraphDrag(
  arrangedPositions: Record<string, WorkflowNodePosition>,
) {
  const [positionOverrides, setPositions] = useState<
    Record<string, WorkflowNodePosition>
  >({});
  const positions = Object.fromEntries(
    Object.entries(arrangedPositions).map(([key, position]) => [
      key,
      positionOverrides[key] ?? position,
    ]),
  );
  const dragState = useRef<DragState | null>(null);

  function startDragging(event: PointerEvent<HTMLButtonElement>, code: string) {
    const origin = positions[code];
    if (!origin || event.button !== 0) return;

    const cardWidth =
      event.currentTarget.parentElement?.getBoundingClientRect().width;
    const scale = cardWidth ? cardWidth / workflowGraphMetrics.nodeWidth : 1;

    dragState.current = {
      code,
      scale,
      origin,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragStage(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current;
    if (!drag) return;

    setPositions((current) => ({
      ...current,
      [drag.code]: {
        x: Math.max(
          workflowGraphMetrics.canvasPadding,
          drag.origin.x + (event.clientX - drag.pointerX) / drag.scale,
        ),
        y: Math.max(
          workflowGraphMetrics.canvasPadding,
          drag.origin.y + (event.clientY - drag.pointerY) / drag.scale,
        ),
      },
    }));
  }

  function stopDragging(event: PointerEvent<HTMLButtonElement>) {
    if (dragState.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragState.current = null;
    }
  }

  return { positions, startDragging, dragStage, stopDragging };
}
