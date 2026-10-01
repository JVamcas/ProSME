// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { ResizableSidebarLayout } from "@/shared/ui/ResizableSidebarLayout";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

async function mountLayout() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <ResizableSidebarLayout resizeLabel="Resize stages" sidebar={<p>Stages</p>}>
      <p>Details</p>
    </ResizableSidebarLayout>,
  ));
  const divider = container.querySelector<HTMLElement>('[role="separator"]')!;
  const layout = divider.parentElement!;
  vi.spyOn(layout, "getBoundingClientRect").mockReturnValue({ width: 1200 } as DOMRect);
  Object.assign(divider, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
  });
  return {
    divider,
    layout,
    async cleanup() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

describe("resizable sidebar layout", () => {
  it("drags both directions, clamps the width, and stops resizing on release", async () => {
    const { divider, layout, cleanup } = await mountLayout();
    async function pointer(type: string, clientX: number) {
      await act(async () => {
        divider.dispatchEvent(new PointerEvent(type, {
          bubbles: true,
          button: 0,
          clientX,
          pointerId: 1,
        }));
      });
    }

    try {
      await pointer("pointerdown", 200);
      await pointer("pointermove", 400);
      expect(divider.getAttribute("aria-valuenow")).toBe("440");
      expect(layout.style.getPropertyValue("--sidebar-width")).toBe("440px");
      await pointer("pointermove", 1000);
      expect(divider.getAttribute("aria-valuenow")).toBe("480");
      await pointer("pointermove", 0);
      expect(divider.getAttribute("aria-valuenow")).toBe("200");
      await pointer("pointerup", 0);
      await pointer("pointermove", 400);
      expect(divider.getAttribute("aria-valuenow")).toBe("200");
      expect(divider.releasePointerCapture).toHaveBeenCalledWith(1);
    } finally {
      await cleanup();
    }
  });

  it("supports keyboard resizing, reset, and preserves room for details", async () => {
    const { divider, layout, cleanup } = await mountLayout();
    async function key(key: string) {
      await act(async () => {
        divider.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
      });
    }

    try {
      await key("ArrowRight");
      expect(divider.getAttribute("aria-valuenow")).toBe("250");
      await key("ArrowLeft");
      expect(divider.getAttribute("aria-valuenow")).toBe("240");
      await key("Home");
      expect(divider.getAttribute("aria-valuenow")).toBe("200");
      vi.mocked(layout.getBoundingClientRect).mockReturnValue({ width: 800 } as DOMRect);
      await key("End");
      expect(divider.getAttribute("aria-valuenow")).toBe("360");
      await act(async () => {
        divider.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      });
      expect(divider.getAttribute("aria-valuenow")).toBe("240");
    } finally {
      await cleanup();
    }
  });
});
