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
  const firstSection = definition.sections[0];
  const secondSectionId = "10000000-0000-4000-8000-000000000002";
  definition.displayMode = "STEPS";
  definition.sections = [
    firstSection,
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
  definition.fields = definition.fields.map((field) => {
    if (field.key === "NAME") return field;
    const otherFields = definition.fields.filter(
      (candidate) => candidate.key !== "NAME",
    );
    return {
      ...field,
      order: otherFields.findIndex((candidate) => candidate.key === field.key) + 1,
      sectionId: secondSectionId,
    };
  });
  return definition;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("step form rendering", () => {
  it("renders one section at a time and navigates between sections", async () => {
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
        >
          <button type="submit">Submit form</button>
        </FormRenderer>,
      );
    });

    expect(container.textContent).toContain("Step 1 of 2: Basic information");
    expect(container.textContent).not.toContain("Additional details.");
    expect(container.textContent).not.toContain("Submit form");

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });

    expect(container.textContent).toContain("Step 2 of 2: Additional details");
    expect(container.textContent).toContain("Additional details.");
    expect(container.textContent).toContain("Submit form");

    await act(async () => root.unmount());
  });

  it("adds supporting documents immediately before the final form section", async () => {
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
          penultimateStep={{
            content: <section>Upload required evidence</section>,
            id: "supporting-documents",
            title: "Supporting documents",
          }}
          supplementalCompletion={{
            completedCount: 0,
            id: "supporting-documents",
            requiredCount: 2,
            title: "Supporting documents",
            unit: "document",
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Step 1 of 3: Basic information");
    expect(container.textContent).toContain(
      "1 of 3 required fields and documents complete",
    );
    expect(container.textContent).toContain("2 required documents remaining");
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });
    expect(container.textContent).toContain("Step 2 of 3: Supporting documents");
    expect(container.textContent).toContain("Upload required evidence");
    expect(container.textContent).not.toContain("Additional details.");
    expect(container.querySelectorAll("form")).toHaveLength(0);

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });
    expect(container.textContent).toContain("Step 3 of 3: Additional details");
    expect(container.textContent).not.toContain("Upload required evidence");

    await act(async () => root.unmount());
  });

  it("does not advance until the current section is valid", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FormRenderer
          definition={steppedDefinition()}
          formData={{}}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );
    });

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });

    expect(container.textContent).toContain("Step 1 of 2: Basic information");
    expect(container.textContent).toContain(
      "Complete or correct this field before continuing.",
    );

    await act(async () => root.unmount());
  });
});
