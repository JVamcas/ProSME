// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FileUploadButton } from "@/shared/ui/FileUploadButton";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.replaceChildren();
});

function dropFile(target: Element, file: File) {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { files: { item: () => file }, types: ["Files"] },
  });
  target.dispatchEvent(event);
}

describe("FileUploadButton", () => {
  it("accepts a selected file and a dropped file in compact mode", async () => {
    const onFile = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FileUploadButton
          accept=".pdf"
          onFile={onFile}
          variant="compact"
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const button = container.querySelector<HTMLButtonElement>("button");
    expect(input?.accept).toBe(".pdf");
    expect(input?.getAttribute("aria-label")).toBe("Upload");
    expect(button?.className).toContain("h-8");
    const openPicker = vi.spyOn(input!, "click");
    await act(async () => button?.click());
    expect(openPicker).toHaveBeenCalledOnce();

    const selected = new File(["selected"], "selected.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(input, "files", {
      configurable: true,
      value: { item: () => selected },
    });
    await act(async () => {
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onFile).toHaveBeenCalledWith(selected);

    const dropped = new File(["dropped"], "dropped.pdf", {
      type: "application/pdf",
    });
    await act(async () => dropFile(container.firstElementChild!, dropped));
    expect(onFile).toHaveBeenCalledWith(dropped);
    await act(async () => root.unmount());
  });

  it("ignores drops when disabled", async () => {
    const onFile = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FileUploadButton disabled onFile={onFile} />);
    });

    const file = new File(["data"], "document.pdf");
    await act(async () => dropFile(container.firstElementChild!, file));
    expect(onFile).not.toHaveBeenCalled();
    expect(container.querySelector("button")?.disabled).toBe(true);
    await act(async () => root.unmount());
  });
});
