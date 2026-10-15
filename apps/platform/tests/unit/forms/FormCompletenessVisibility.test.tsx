// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formVersionSchema } from "@/modules/forms/api/FormSchemas";
import { FormPresentationSettings } from "@/modules/forms/ui/builder/FormPresentationSettings";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { runtimeDefinition } from "../../support/form-runtime";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("form completeness visibility", () => {
  it.each([undefined, true, false])(
    "renders the summary according to the saved setting: %s",
    (showCompleteness) => {
      const markup = renderToStaticMarkup(
        <FormRenderer
          definition={{ ...runtimeDefinition(), showCompleteness }}
          formData={{}}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );
      expect(markup.includes('aria-label="Form completeness"')).toBe(
        showCompleteness !== false,
      );
      expect(markup).toContain('name="root_NAME"');
    },
  );

  it("preserves a host's ability to suppress the summary", () => {
    const markup = renderToStaticMarkup(
      <FormRenderer
        definition={{ ...runtimeDefinition(), showCompleteness: true }}
        formData={{}}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        showCompleteness={false}
      />,
    );
    expect(markup).not.toContain('aria-label="Form completeness"');
  });

  it("validates boolean settings while accepting older payloads", () => {
    const input = { displayMode: "SINGLE_PAGE", submitLabel: "Submit" };
    expect(formVersionSchema.parse(input).showCompleteness).toBeUndefined();
    expect(formVersionSchema.parse({ ...input, showCompleteness: false }))
      .toMatchObject({ showCompleteness: false });
    expect(formVersionSchema.safeParse({ ...input, showCompleteness: "false" })
      .success).toBe(false);
  });

  it("saves checkbox changes and disables editing for published forms", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const change = vi.fn();
    const props = {
      canEdit: true,
      displayMode: "SINGLE_PAGE" as const,
      onChange: vi.fn(),
      showCompleteness: true,
      onShowCompletenessChange: change,
    };
    try {
      await act(async () => {
        root.render(<FormPresentationSettings {...props} />);
      });
      const checkbox = container.querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )!;
      expect(checkbox.checked).toBe(true);
      await act(async () => checkbox.click());
      expect(change).toHaveBeenLastCalledWith(false);
      await act(async () => {
        root.render(
          <FormPresentationSettings {...props} canEdit={false} showCompleteness={false} />,
        );
      });
      expect(checkbox.checked).toBe(false);
      expect(checkbox.disabled).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
