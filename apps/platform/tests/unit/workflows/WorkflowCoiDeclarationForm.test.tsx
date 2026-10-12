import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  submit: undefined as undefined | ((values: Record<string, unknown>) => void),
  mutate: vi.fn().mockResolvedValue({ state: "CLEARED_NO_CONFLICT" }),
}));
vi.mock("@/modules/forms/ui/renderer/FormRenderer", () => ({
  FormRenderer: ({ onSubmit }: { onSubmit: typeof state.submit }) => {
    state.submit = onSubmit;
    return null;
  },
}));
vi.mock("@/modules/workflows/ui/runtime/useWorkflowCoi", () => ({
  useDeclareWorkflowCoi: () => ({ mutateAsync: state.mutate, isPending: false }),
}));
import { WorkflowTaskCoiGate } from "@/modules/workflows/ui/runtime/WorkflowTaskCoiGate";
import { coiForm, coiAnswers, coiTaskId } from "../../support/WorkflowCoiFixture";
it("sends the complete dynamic answer set without selecting only the conflict fields", () => {
  renderToStaticMarkup(<WorkflowTaskCoiGate gate={{
    form: coiForm, taskId: coiTaskId, taskName: "Review", taskStatus: "PENDING",
    rowVersion: 2, gated: true, state: "DECLARATION_REQUIRED", cleared: false,
  }} />);
  const values = { ...coiAnswers, CUSTOM_TEXT: "Configured answer", CUSTOM_LIST: ["A", "B"] };
  state.submit!(values);
  expect(state.mutate).toHaveBeenCalledWith({
    expectedRowVersion: 2, formVersionId: coiForm.versionId, values,
  }, expect.objectContaining({ onError: expect.any(Function) }));
});
