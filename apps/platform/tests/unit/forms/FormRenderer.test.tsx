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
    expect(markup).toContain('class="rjsf"');
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
    expect(markup).toContain("rounded-xl");
    expect(markup).toContain("focus:border-brand-orange");
  });
});
