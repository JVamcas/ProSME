"use client";

import { useRef } from "react";
import styles from "./NavigationSidebar.module.css";

export const sidebarWidths = {
  expanded: 272,
  collapsed: 80,
  min: 240,
  max: 480,
};

export function clampSidebarWidth(width: number) {
  return Math.min(sidebarWidths.max, Math.max(sidebarWidths.min, width));
}

export function SidebarResizeHandle({
  onResize,
  width,
}: {
  onResize: (width: number) => void;
  width: number;
}) {
  const resizing = useRef(false);

  return (
    <div
      aria-label="Resize navigation sidebar"
      aria-orientation="vertical"
      aria-valuemax={sidebarWidths.max}
      aria-valuemin={sidebarWidths.min}
      aria-valuenow={width}
      className={styles.resize}
      onDoubleClick={() => onResize(sidebarWidths.expanded)}
      onKeyDown={(event) => {
        const widths: Record<string, number> = {
          ArrowLeft: width - 16,
          ArrowRight: width + 16,
          Home: sidebarWidths.min,
          End: sidebarWidths.max,
        };
        if (event.key in widths) {
          event.preventDefault();
          onResize(clampSidebarWidth(widths[event.key]));
        }
      }}
      onLostPointerCapture={() => {
        resizing.current = false;
      }}
      onPointerDown={(event) => {
        resizing.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (resizing.current) onResize(clampSidebarWidth(event.clientX));
      }}
      onPointerUp={(event) => {
        resizing.current = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }}
      role="separator"
      tabIndex={0}
      title="Drag to resize; double-click to reset"
    />
  );
}
