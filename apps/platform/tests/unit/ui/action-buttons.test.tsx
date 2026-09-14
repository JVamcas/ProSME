import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ActivateButton,
  DeactivateButton,
  DeleteButton,
  EditButton,
} from "@/components/ui/action-buttons";

describe("action buttons", () => {
  it("renders accessible labels for each reusable action", () => {
    const markup = renderToStaticMarkup(
      <div>
        <EditButton />
        <DeleteButton />
        <ActivateButton />
        <DeactivateButton />
      </div>,
    );

    expect(markup).toContain('aria-label="Edit"');
    expect(markup).toContain('aria-label="Delete"');
    expect(markup).toContain('aria-label="Activate"');
    expect(markup).toContain('aria-label="Deactivate"');
  });

  it("supports custom titles and loading state", () => {
    const markup = renderToStaticMarkup(
      <EditButton isLoading title="Edit workflow" />,
    );

    expect(markup).toContain('aria-label="Edit workflow"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("animate-spin");
  });
});
