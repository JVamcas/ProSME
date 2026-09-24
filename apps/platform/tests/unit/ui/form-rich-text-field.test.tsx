// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import { FormRichTextField } from "@/shared/ui/FormRichTextField";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

function RichTextForm() {
  const form = useForm({
    defaultValues: { description: "<p>Funding <strong>details</strong></p>" },
  });
  return (
    <FormProvider {...form}>
      <form>
        <FormRichTextField label="Description" name="description" required />
      </form>
    </FormProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("FormRichTextField", () => {
  it("renders initial HTML and accessible formatting controls", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<RichTextForm />));

    expect(container.querySelector('[role="textbox"]')?.textContent).toBe(
      "Funding details",
    );
    expect(container.querySelector("strong")?.textContent).toBe("details");
    expect(container.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Bold"]')).not.toBeNull();

    await act(async () => root.unmount());
  });
});
