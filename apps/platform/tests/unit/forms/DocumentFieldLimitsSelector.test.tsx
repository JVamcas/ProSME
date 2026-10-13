// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { DocumentFieldLimits } from "@/modules/forms/ui/builder/DocumentFieldLimits";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Fixture({
  maxPages,
  saved,
}: {
  maxPages?: number;
  saved: (field: z.output<typeof formFieldSchema>) => void;
}) {
  const form = useForm<
    z.input<typeof formFieldSchema>,
    unknown,
    z.output<typeof formFieldSchema>
  >({
    resolver: zodResolver(formFieldSchema),
    defaultValues: {
      columnSpan: 1,
      sectionId: "20000000-0000-4000-8000-000000000001",
      key: "DOCUMENT",
      label: "Document",
      type: "DOCUMENT",
      order: 1,
      required: true,
      maxPages,
      acceptedExtensions: [".txt"],
    },
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(saved)}>
        <DocumentFieldLimits />
      </form>
    </FormProvider>
  );
}

describe("document file-type selector", () => {
  it.each([undefined, 5])(
    "saves the selection with page limit %s",
    async (maxPages) => {
      const saved = vi.fn();
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () =>
          root.render(<Fixture maxPages={maxPages} saved={saved} />),
        );
        const button = container.querySelector<HTMLButtonElement>(
          'button[aria-haspopup="listbox"]',
        )!;
        if (maxPages === undefined) {
          await act(async () => button.click());
          const options = Array.from(
            document.querySelectorAll('[role="option"]'),
          );
          expect(options.map((option) => option.textContent)).toEqual([
            "PDF",
            "DOCX",
            "XLS",
            "XLSX",
            "TXT",
            "CSV",
            "JPG",
            "JPEG",
            "PNG",
          ]);
          const csv = options.find((option) => option.textContent === "CSV")!;
          await act(async () =>
            csv.querySelector<HTMLInputElement>("input")!.click(),
          );
        } else {
          expect(button.disabled).toBe(true);
          expect(button.textContent).toContain("PDF");
        }
        await act(async () => {
          container
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );
        });
        expect(saved).toHaveBeenCalledOnce();
        expect(saved.mock.calls[0][0].acceptedExtensions).toEqual(
          maxPages === undefined ? [".txt", ".csv"] : [".pdf"],
        );
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );
});
