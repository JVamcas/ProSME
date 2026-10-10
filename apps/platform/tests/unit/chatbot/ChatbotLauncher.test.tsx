// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatbotLauncher } from "@/modules/chatbot/ui/public/ChatbotLauncher";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let motion: MediaQueryList;
const onOpen = vi.fn();

async function movePointer(
  button: HTMLButtonElement,
  type: "pointerover" | "pointerout",
  pointerType = "mouse",
) {
  await act(async () => {
    button.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerType }),
    );
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  onOpen.mockClear();
  motion = {
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal("matchMedia", () => motion);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("stays icon-only until hovered, then expands and types without opening chat", async () => {
  await act(async () =>
    root.render(<ChatbotLauncher open={false} onOpen={onOpen} />),
  );
  const button = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Ask about funding"]',
  )!;
  const label = button.querySelector("[data-expanded]")!;
  const typed = label.firstElementChild!.lastElementChild!;
  expect(label.getAttribute("data-expanded")).toBe("false");
  expect(typed.textContent).toBe("");
  expect(button.getAttribute("aria-expanded")).toBe("false");
  await act(async () => vi.advanceTimersByTime(5000));
  expect(label.getAttribute("data-expanded")).toBe("false");
  expect(typed.textContent).toBe("");
  await movePointer(button, "pointerover");
  expect(label.getAttribute("data-expanded")).toBe("true");
  await act(async () => vi.advanceTimersByTime(65));
  expect(typed.textContent).toBe("A");
  await act(async () => vi.advanceTimersByTime(1040));
  expect(typed.textContent).toBe("Ask about funding");
  expect(onOpen).not.toHaveBeenCalled();
  await act(async () => button.click());
  expect(onOpen).toHaveBeenCalledTimes(1);
});

it("reveals the full label only on hover for reduced motion", async () => {
  Object.defineProperty(motion, "matches", { value: true });
  await act(async () =>
    root.render(<ChatbotLauncher open={false} onOpen={onOpen} />),
  );
  const button = document.querySelector<HTMLButtonElement>("button")!;
  const label = button.querySelector("[data-expanded]")!;
  expect(label.getAttribute("data-expanded")).toBe("false");
  await movePointer(button, "pointerover");
  expect(label.getAttribute("data-expanded")).toBe("true");
  expect(
    document.querySelector("[data-expanded]")?.firstElementChild
      ?.lastElementChild?.textContent,
  ).toBe("Ask about funding");
  expect(vi.getTimerCount()).toBe(0);
  await movePointer(button, "pointerout");
  expect(label.getAttribute("data-expanded")).toBe("false");
});

it("cancels typing on pointer leave and restarts it on the next hover", async () => {
  await act(async () =>
    root.render(<ChatbotLauncher open={false} onOpen={onOpen} />),
  );
  const button = document.querySelector<HTMLButtonElement>("button")!;
  const label = button.querySelector("[data-expanded]")!;
  const typed = label.firstElementChild!.lastElementChild!;
  await movePointer(button, "pointerover");
  await act(async () => vi.advanceTimersByTime(195));
  expect(typed.textContent).toBe("Ask");
  await movePointer(button, "pointerout");
  expect(label.getAttribute("data-expanded")).toBe("false");
  expect(typed.textContent).toBe("");
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => vi.advanceTimersByTime(5000));
  expect(label.getAttribute("data-expanded")).toBe("false");
  await movePointer(button, "pointerover");
  await act(async () => vi.advanceTimersByTime(65));
  expect(typed.textContent).toBe("A");
});

it("keeps touch interaction icon-only while allowing the chat to open", async () => {
  await act(async () =>
    root.render(<ChatbotLauncher open={false} onOpen={onOpen} />),
  );
  const button = document.querySelector<HTMLButtonElement>("button")!;
  await movePointer(button, "pointerover", "touch");
  await act(async () => button.click());
  expect(
    button.querySelector("[data-expanded]")?.getAttribute("data-expanded"),
  ).toBe("false");
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
