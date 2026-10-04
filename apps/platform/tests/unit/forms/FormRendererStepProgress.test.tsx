// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { runtimeDefinition } from "../../support/form-runtime";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

function steppedDefinition() {
  const definition = runtimeDefinition();
  const secondSectionId = "10000000-0000-4000-8000-000000000002";
  definition.displayMode = "STEPS";
  definition.sections = [
    definition.sections[0],
    {
      columnSpan: 3,
      description: "Additional details.",
      id: secondSectionId,
      key: "ADDITIONAL_DETAILS",
      order: 2,
      showContainer: true,
      title: "Additional details",
    },
  ];
  definition.fields = definition.fields.filter((field) => field.key === "NAME");
  return definition;
}

function buttonWithText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button"))
    .find((button) => button.textContent === text);
}

afterEach(() => {
  document.body.replaceChildren();
  sessionStorage.clear();
});

describe("application form step progress", () => {
  it("retains a completed step's status color and tick after back navigation", async () => {
    const persistenceKey = "application:test:status:step";
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FormRenderer
          definition={steppedDefinition()}
          formData={{ NAME: "Valid name" }}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          stepPersistenceKey={persistenceKey}
        />,
      );
    });

    await act(async () => buttonWithText(container, "Next")?.click());
    await act(async () => buttonWithText(container, "Back")?.click());

    const completedStep = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Basic information, complete"]',
    );
    expect(completedStep?.querySelector("svg")).not.toBeNull();
    expect(completedStep?.querySelector("span")?.className).toContain(
      "bg-brand-green-soft",
    );

    await act(async () => root.unmount());
  });
});
