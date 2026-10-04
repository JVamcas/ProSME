// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DropdownButton } from "@/shared/ui/DropdownButton";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
});

async function openDropdown() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const onAction = vi.fn();

  await act(async () => {
    root.render(
      <DropdownButton
        items={[
          { id: "hold", label: "Put on hold", onAction },
          { id: "resume", label: "Resume", disabled: true, onAction },
        ]}
        label="Actions"
      />,
    );
  });

  const trigger = container.querySelector<HTMLButtonElement>("button")!;
  await act(async () => trigger.click());
  expect(document.querySelector('[role="menu"]')).not.toBeNull();

  return { onAction, trigger };
}

async function clickElement(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    element.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0 }),
    );
    element.click();
  });
}

describe("dropdown button", () => {
  it("closes after clicking a non-focusable area outside the menu", async () => {
    const { onAction, trigger } = await openDropdown();

    await clickElement(document.body);

    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("keeps the menu open when clicking a disabled item inside it", async () => {
    const { onAction } = await openDropdown();
    const disabledItem = document.querySelector<HTMLElement>(
      '[role="menuitem"][aria-disabled="true"]',
    )!;

    await clickElement(disabledItem);

    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });
});
