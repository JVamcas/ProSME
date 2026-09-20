import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { runtimeDefinition } from "../../support/form-runtime";

describe("RJSF form renderer", () => {
  it("renders a saved form definition through RJSF", () => {
    const markup = renderToStaticMarkup(
      <FormRenderer
        definition={runtimeDefinition()}
        formData={{}}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      >
        <button type="submit">Submit form</button>
      </FormRenderer>,
    );

    expect(markup).toContain("Complete the form.");
    expect(markup).toContain('aria-label="Form completeness"');
    expect(markup).toContain("0 of 1 required fields complete");
    expect(markup).toContain("1 required field remaining");
    expect(markup).toContain('aria-valuenow="0"');
    expect(markup).toContain('class="rjsf"');
    expect(markup).toContain("grid-cols-1 md:grid-cols-2 xl:grid-cols-3");
    expect(markup).toContain(
      "grid gap-5 mt-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    );
    expect(markup).toContain("Basic information");
    expect(markup).toContain('name="root_NAME"');
    expect(markup).toContain("<textarea");
    expect(markup).toContain('type="number"');
    expect(markup).toContain('min="100"');
    expect(markup).toContain('max="1000"');
    expect(markup).toContain('aria-label="Open calendar"');
    expect(markup).toContain("Yes");
    expect(markup).toContain("No");
    expect(markup).toContain("First option");
    expect(markup).toContain("Second option");
    expect(markup).toContain('multiple=""');
    expect(markup).toContain("N$");
    expect(markup).toContain("SUCCESS_RATE label (%)");
    expect(markup).toContain('type="file"');
    expect(markup).toContain("rounded-xl");
    expect(markup).toContain("focus:border-brand-orange");
  });

  it("keeps the section grid when its fields use fewer columns", () => {
    const definition = runtimeDefinition();
    definition.fields[0].columnSpan = 2;
    const markup = renderToStaticMarkup(
      <FormRenderer
        definition={definition}
        formData={{}}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      >
        <button type="submit">Submit form</button>
      </FormRenderer>,
    );

    expect(markup).toContain(
      "grid gap-5 mt-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    );
  });

  it("fills a two-column section with two one-column fields", () => {
    const definition = runtimeDefinition();
    definition.sections[0].columnSpan = 2;
    definition.fields = definition.fields
      .filter((field) => field.key === "NAME" || field.key === "NOTES")
      .map((field) => ({ ...field, columnSpan: 1 }));
    const markup = renderToStaticMarkup(
      <FormRenderer
        definition={definition}
        formData={{}}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      >
        <button type="submit">Submit form</button>
      </FormRenderer>,
    );

    expect(markup).toContain(
      "grid gap-5 mt-4 grid-cols-1 md:grid-cols-2",
    );
    expect(markup.match(/class="col-span-1"/g)).toHaveLength(2);
  });

  it("fills a two-column section with one two-column field", () => {
    const definition = runtimeDefinition();
    definition.sections[0].columnSpan = 2;
    definition.fields = definition.fields
      .filter((field) => field.key === "NAME")
      .map((field) => ({ ...field, columnSpan: 2 }));
    const markup = renderToStaticMarkup(
      <FormRenderer
        definition={definition}
        formData={{}}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      >
        <button type="submit">Submit form</button>
      </FormRenderer>,
    );

    expect(markup).toContain(
      "grid gap-5 mt-4 grid-cols-1 md:grid-cols-2",
    );
    expect(markup).toContain(
      '<div class="col-span-1 md:col-span-2">',
    );
  });

  it("allows a read-only preview to suppress the RJSF submit button", () => {
    const markup = renderToStaticMarkup(
      <FormRenderer
        definition={runtimeDefinition()}
        formData={{}}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        readOnly
      >
        <></>
      </FormRenderer>,
    );

    expect(markup).not.toContain(">Submit<");
    expect(markup).not.toContain('type="submit"');
  });
});
