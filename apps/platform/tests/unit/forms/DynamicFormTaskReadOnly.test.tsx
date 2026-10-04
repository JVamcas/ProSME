import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readOnly: false,
  controller: vi.fn(),
  renderer: vi.fn(),
}));
vi.mock("@/modules/forms/FormHooks", () => ({
  useTaskForm: () => ({
    isPending: false,
    isError: false,
    data: {
      readOnly: mocks.readOnly,
      schema: { versionId: "bound-version", fields: [], sections: [] },
      response: { status: "DRAFT", values: { recommendation: "Saved answer" } },
      context: { "application.amount": 123 },
    },
  }),
}));
vi.mock("@/modules/forms/ui/renderer/DynamicFormController", () => ({
  useDynamicFormController: mocks.controller,
}));
vi.mock("@/modules/forms/ui/renderer/FormRenderer", () => ({
  FormRenderer: (props: unknown) => {
    mocks.renderer(props);
    return <p>Saved form</p>;
  },
}));

import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";

beforeEach(() => vi.clearAllMocks());
describe("read-only dynamic task form", () => {
  it.each([false, true])("does not mount autosave or eligibility controls (server marker: %s)", (serverReadOnly) => {
    mocks.readOnly = serverReadOnly;
    const markup = renderToStaticMarkup(
      <DynamicFormTask eligibilityTask readOnly={!serverReadOnly} taskId="task" />,
    );
    expect(markup).toContain("Saved form");
    expect(markup).not.toContain("Run eligibility");
    expect(mocks.controller).not.toHaveBeenCalled();
    expect(mocks.renderer).toHaveBeenCalledWith(expect.objectContaining({
      readOnly: true,
      formData: { recommendation: "Saved answer" },
      runtimeContext: { "application.amount": 123 },
    }));
  });
});
