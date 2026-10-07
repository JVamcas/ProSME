"use client";

import {
  heatmapFormSelector,
  type HeatmapBox,
  type HeatmapLayout,
} from "./domain/WebsiteHeatmap";

const tags = new Set([
  "header",
  "main",
  "footer",
  "section",
  "article",
  "nav",
  "button",
  "a",
]);

export function captureHeatmapLayout(page: string): HeatmapLayout | null {
  const viewportWidth = window.innerWidth;
  const documentHeight = document.documentElement.scrollHeight;
  if (
    viewportWidth < 100 ||
    viewportWidth > 4000 ||
    documentHeight < 100 ||
    documentHeight > 100000
  ) {
    return null;
  }
  const boxes: HeatmapBox[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
  );
  let visited = 0;
  let node = walker.nextNode();
  while (node && visited < 500 && boxes.length < 80) {
    visited += 1;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (tags.has(tag) && !element.closest(heatmapFormSelector)) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = Math.max(0, Math.round((rect.left / viewportWidth) * 10000));
        const y = Math.max(
          0,
          Math.round(((rect.top + window.scrollY) / documentHeight) * 10000),
        );
        const width = Math.min(
          10000 - x,
          Math.round((rect.width / viewportWidth) * 10000),
        );
        const height = Math.min(
          10000 - y,
          Math.round((rect.height / documentHeight) * 10000),
        );
        if (width > 0 && height > 0) {
          boxes.push({ tag: tag as HeatmapBox["tag"], x, y, width, height });
        }
      }
    }
    node = walker.nextNode();
  }
  return { page, viewportWidth, documentHeight, boxes };
}

export function heatmapScrollDepth(height: number) {
  const bottom = Math.min(height, window.scrollY + window.innerHeight);
  return Math.max(0, Math.min(100, Math.floor((bottom / height) * 10) * 10));
}
