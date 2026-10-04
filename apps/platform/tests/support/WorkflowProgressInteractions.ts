import { act } from "react";
import { expect } from "vitest";

export async function openVisualFlow(container: HTMLElement) {
  const toggle = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Show visual flow",
  );
  expect(toggle).toBeDefined();
  await act(async () => toggle!.click());
}
