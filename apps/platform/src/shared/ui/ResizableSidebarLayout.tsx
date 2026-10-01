"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  sidebar: ReactNode;
  resizeLabel: string;
};

const defaultWidth = 240;
const minimumWidth = 200;
const maximumWidth = 480;

export function ResizableSidebarLayout({ children, sidebar, resizeLabel }: Props) {
  const sidebarId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [width, setWidth] = useState(defaultWidth);
  const style = { "--sidebar-width": `${width}px` } as CSSProperties;

  function resize(nextWidth: number) {
    const containerWidth = containerRef.current?.getBoundingClientRect().width;
    const availableWidth = containerWidth
      ? Math.max(minimumWidth, Math.min(maximumWidth, containerWidth * 0.45))
      : maximumWidth;
    setWidth(
      Math.round(Math.max(minimumWidth, Math.min(availableWidth, nextWidth))),
    );
  }

  function startDragging(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startWidth: sidebarRef.current?.getBoundingClientRect().width || width,
    };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const origin = dragRef.current;
    if (origin) resize(origin.startWidth + event.clientX - origin.startX);
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 10;
    const keyWidths: Record<string, number> = {
      ArrowLeft: width - step,
      ArrowRight: width + step,
      Home: minimumWidth,
      End: maximumWidth,
    };
    if (keyWidths[event.key] === undefined) return;
    event.preventDefault();
    resize(keyWidths[event.key]);
  }

  return (
    <div
      className="grid min-w-0 gap-y-4 lg:grid-cols-[minmax(0,min(var(--sidebar-width),45%))_16px_minmax(0,1fr)]"
      ref={containerRef}
      style={style}
    >
      <div className="min-w-0" id={sidebarId} ref={sidebarRef}>
        {sidebar}
      </div>
      <div
        aria-controls={sidebarId}
        aria-label={resizeLabel}
        aria-orientation="vertical"
        aria-valuemax={maximumWidth}
        aria-valuemin={minimumWidth}
        aria-valuenow={width}
        className="group hidden cursor-col-resize touch-none select-none items-center justify-center rounded-lg outline-none hover:bg-brand-blue/10 focus-visible:ring-2 focus-visible:ring-brand-blue lg:flex"
        onDoubleClick={() => setWidth(defaultWidth)}
        onKeyDown={handleKeyDown}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
        onPointerCancel={stopDragging}
        onPointerDown={startDragging}
        onPointerMove={drag}
        onPointerUp={stopDragging}
        role="separator"
        tabIndex={0}
        title="Drag to resize. Double-click to reset."
      >
        <span className="h-12 w-1 rounded-full bg-brand-navy/15 transition-colors group-hover:bg-brand-orange group-focus-visible:bg-brand-orange" />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
