"use client";

import { ClientRequestError } from "@/lib/client-http";
import {
  captureHeatmapLayout,
  heatmapScrollDepth,
} from "./ClientWebsiteHeatmapLayoutService";
import {
  heatmapFormSelector,
  isHeatmapPublicPath,
  type HeatmapBatch,
} from "./domain/WebsiteHeatmap";

type Upload = (batch: HeatmapBatch, final: boolean) => Promise<void> | void;
let active: {
  batch: HeatmapBatch;
  href: string;
  upload: Upload;
  sentClicks: number;
  sentDepth: number;
} | null = null;
let cleanup: (() => void) | null = null;
let cancelPending: (() => void) | null = null;
let navigationInstalled = false;

function flush(final = false) {
  if (active) {
    if (
      active.href === location.href &&
      document.documentElement.scrollHeight ===
        active.batch.layout.documentHeight
    ) {
      active.batch.maxDepth = Math.max(
        active.batch.maxDepth,
        heatmapScrollDepth(active.batch.layout.documentHeight),
      );
    }
    const session = active;
    const snapshot = structuredClone(session.batch);
    // Failed batches stay unacknowledged; retries keep the same view and sequences.
    try {
      Promise.resolve(session.upload(snapshot, final))
        .then(() => {
          session.sentClicks = Math.max(
            session.sentClicks,
            snapshot.clicks.length,
          );
          session.sentDepth = Math.max(session.sentDepth, snapshot.maxDepth);
        })
        .catch((error: unknown) => handleUploadFailure(error, session));
    } catch (error) {
      handleUploadFailure(error, session);
    }
  }
}

function handleUploadFailure(
  error: unknown,
  session: NonNullable<typeof active>,
) {
  if (
    active === session &&
    error instanceof ClientRequestError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  ) {
    // Retrying the same invalid or forbidden batch cannot succeed. Stop this
    // view without another final upload; transient failures remain retryable.
    stop();
  }
}

function stop(final = false) {
  if (final) flush(true);
  cleanup?.();
  cleanup = null;
  cancelPending?.();
  cancelPending = null;
  active = null;
}

function idle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 1000);
  return () => window.clearTimeout(id);
}

function installNavigation() {
  if (navigationInstalled) return;
  navigationInstalled = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method].bind(history);
    history[method] = (data, unused, url) => {
      if (url && new URL(url, location.href).href !== location.href) stop(true);
      original(data, unused, url);
    };
  }
}

function start(enabled: boolean, upload: Upload) {
  stop();
  const url = new URL(location.href);
  if (
    !enabled ||
    url.search ||
    url.hash ||
    !isHeatmapPublicPath(url.pathname)
  ) {
    return;
  }
  installNavigation();
  const href = url.href;
  cancelPending = idle(() => {
    cancelPending = null;
    if (location.href !== href) {
      return;
    }
    const layout = captureHeatmapLayout(url.pathname);
    if (!layout) {
      return;
    }
    active = {
      href,
      upload,
      sentClicks: -1,
      sentDepth: -1,
      batch: {
        viewId: crypto.randomUUID(),
        layout,
        clicks: [],
        maxDepth: heatmapScrollDepth(layout.documentHeight),
      },
    };
    installCapture(enabled, upload);
    flush();
  });
}

function installCapture(enabled: boolean, upload: Upload) {
  let scrollTimer: number | null = null;
  let cancelUpload: (() => void) | null = null;
  const valid = () => {
    if (active?.href !== location.href) {
      stop();
      return false;
    }
    if (
      window.innerWidth !== active.batch.layout.viewportWidth ||
      document.documentElement.scrollHeight !==
        active.batch.layout.documentHeight
    ) {
      stop(true);
      start(enabled, upload);
      return false;
    }
    return true;
  };
  const click = (event: MouseEvent) => {
    if (!valid() || !active || !event.isTrusted) {
      return;
    }
    const element = event.target instanceof Element ? event.target : null;
    if (
      !element ||
      element.closest(heatmapFormSelector) ||
      active.batch.clicks.length >= 200
    ) {
      return;
    }
    const x = Math.floor(
      (event.clientX / active.batch.layout.viewportWidth) * 100,
    );
    const y = Math.floor(
      ((event.clientY + window.scrollY) / active.batch.layout.documentHeight) *
        100,
    );
    if (x < 0 || x > 99 || y < 0 || y > 99) {
      return;
    }
    active.batch.clicks.push({ sequence: active.batch.clicks.length, x, y });
    const anchor = element.closest("a");
    if (
      anchor?.href &&
      new URL(anchor.href, hrefForActive()).href !== location.href
    ) {
      stop(true);
    }
  };
  const depth = () => {
    scrollTimer = null;
    if (!valid() || !active) {
      return;
    }
    const max = heatmapScrollDepth(active.batch.layout.documentHeight);
    if (max > active.batch.maxDepth) {
      active.batch.maxDepth = max;
    }
  };
  const scroll = () => {
    if (scrollTimer === null) {
      scrollTimer = window.setTimeout(depth, 250);
    }
  };
  const visibility = () => {
    if (document.visibilityState === "hidden") {
      flush(true);
    }
  };
  const exit = () => stop(true);
  const interval = window.setInterval(() => {
    if (
      valid() &&
      active &&
      (active.sentClicks !== active.batch.clicks.length ||
        active.sentDepth !== active.batch.maxDepth)
    ) {
      cancelUpload?.();
      cancelUpload = idle(() => {
        cancelUpload = null;
        flush();
      });
    }
  }, 10000);
  document.addEventListener("click", click, true);
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", depth, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  for (const event of ["pagehide", "popstate", "hashchange"]) {
    window.addEventListener(event, exit, true);
  }
  cleanup = () => {
    cancelUpload?.();
    window.clearInterval(interval);
    if (scrollTimer !== null) {
      window.clearTimeout(scrollTimer);
    }
    document.removeEventListener("click", click, true);
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("resize", depth);
    document.removeEventListener("visibilitychange", visibility);
    for (const event of ["pagehide", "popstate", "hashchange"]) {
      window.removeEventListener(event, exit, true);
    }
  };
}

function hrefForActive() {
  return active?.href ?? location.href;
}

export const clientWebsiteHeatmapCaptureService = { start, stop };
