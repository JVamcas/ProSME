// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DraggableDialog } from "@/shared/ui/DraggableDialog";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  root = null;
  document.body.replaceChildren();
  document.body.style.overflow = "";
});

describe("DraggableDialog focus lifecycle", () => {
  it("keeps focus when the close callback changes and uses the latest callback", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const initialClose = vi.fn();
    const updatedClose = vi.fn();

    function dialog(onClose: () => void) {
      return (
        <DraggableDialog isOpen onClose={onClose} title="Review">
          <input aria-label="Notes" />
        </DraggableDialog>
      );
    }

    await act(async () => root?.render(dialog(initialClose)));
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Close dialog",
    );
    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="Notes"]',
    )!;
    await act(async () => input.focus());
    await act(async () => root?.render(dialog(updatedClose)));

    expect(document.activeElement).toBe(input);
    expect(document.body.style.overflow).toBe("hidden");
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(initialClose).not.toHaveBeenCalled();
    expect(updatedClose).toHaveBeenCalledOnce();
  });

  it("restores the opening control and body scrolling when the dialog closes", async () => {
    const opener = document.createElement("button");
    const container = document.createElement("div");
    document.body.append(opener, container);
    document.body.style.overflow = "auto";
    opener.focus();
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <DraggableDialog isOpen onClose={() => {}} title="Review">
          <input aria-label="Notes" />
        </DraggableDialog>,
      );
    });
    await act(async () => {
      document.querySelector<HTMLInputElement>('[aria-label="Notes"]')?.focus();
    });
    await act(async () => {
      root?.render(
        <DraggableDialog isOpen={false} onClose={() => {}} title="Review">
          <input aria-label="Notes" />
        </DraggableDialog>,
      );
    });

    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe("auto");
  });
});
