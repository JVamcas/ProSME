// @vitest-environment happy-dom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { FormStepProgress } from "@/modules/forms/ui/renderer/FormStepNavigation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("reorders actual form steps with the keyboard drag handle", async () => {
  const changed = vi.fn();
  const labels = { documents: "Documents", form: "Financial form", checklist: "Checklist" };
  type Id = keyof typeof labels;
  function View() {
    const [ids, setIds] = useState<Id[]>(["form", "checklist", "documents"]);
    return (
      <FormStepProgress
        currentIndex={0}
        completedStepIds={[]}
        onStepChange={() => undefined}
        onOrderChange={(next) => {
          changed(next);
          setIds(next as Id[]);
        }}
        steps={ids.map((id) => ({ id, title: labels[id] }))}
      />
    );
  }
  const bounds = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const li = this.closest("li");
    const index = li ? Array.from(li.parentElement!.children).indexOf(li) : 0;
    return new DOMRect(index * 150, 0, 150, 100);
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<View />));
    const handle = container.querySelector<HTMLButtonElement>('[aria-label="Move documents step"]')!;
    handle.focus();
    async function key(code: string, key: string) {
      await act(async () => {
        handle.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
    await key("Space", " ");
    await key("ArrowLeft", "ArrowLeft");
    await key("ArrowLeft", "ArrowLeft");
    await key("Space", " ");
    expect(changed).toHaveBeenCalledWith(["documents", "form", "checklist"]);
  } finally {
    await act(async () => root.unmount());
    bounds.mockRestore();
    container.remove();
  }
});
