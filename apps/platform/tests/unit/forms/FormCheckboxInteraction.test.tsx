// @vitest-environment happy-dom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { GeneralButton } from "@/shared/ui/Button";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { runtimeDefinition } from "../../support/form-runtime";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("saves explicit checkbox changes and permits submission only after a required checkbox is checked", async () => {
  const definition = runtimeDefinition();
  definition.fields = [{
    ...definition.fields[1],
    key: "CUSTOM_AGREEMENT",
    label: "I accept this configurable statement.",
    type: "CHECKBOX",
    required: true,
    order: 1,
    minLength: undefined,
    maxLength: undefined,
  }];
  const submit = vi.fn();
  const changed = vi.fn();
  function View() {
    const [values, setValues] = useState<Record<string, unknown>>({});
    return (
      <FormRenderer
        definition={definition}
        formData={values}
        onChange={(next) => {
          changed(next);
          setValues(next);
        }}
        onSubmit={submit}
      >
        <GeneralButton type="submit">Submit</GeneralButton>
      </FormRenderer>
    );
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<View />));
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const form = container.querySelector("form")!;
    expect(checkbox.checked).toBe(false);
    async function send() {
      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
    }
    await send();
    expect(submit).not.toHaveBeenCalled();
    await act(async () => checkbox.click());
    expect(changed).toHaveBeenLastCalledWith({ CUSTOM_AGREEMENT: true });
    await send();
    expect(submit).toHaveBeenCalledWith({ CUSTOM_AGREEMENT: true });
    await act(async () => checkbox.click());
    expect(changed).toHaveBeenLastCalledWith({ CUSTOM_AGREEMENT: false });
    submit.mockClear();
    await send();
    expect(submit).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
