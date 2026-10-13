// @vitest-environment happy-dom
import { act, useState, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/forms/ui/useTaskFormConfiguration", () => ({
  useTaskFormOptions: () => ({ data: [], isPending: false }),
}));
import { WorkflowStageDetails } from "@/modules/workflows/ui/definitions/WorkflowStageDetails";
import { WorkflowSearchContext } from "@/modules/workflows/ui/definitions/search/WorkflowSearchTarget";
import {
  findWorkflowMatches,
  workflowSearchEntries,
  type WorkflowSearchMatch,
} from "@/modules/workflows/domain/definitions/WorkflowSearch";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import type { FormSearchContent } from "@/modules/forms/domain/FormSearchContent";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function mount() {
  const graph = structuredClone(referenceWorkflow);
  const stage = graph.stages[1];
  const task = stage.tasks[0];
  task.formBinding = { formVersionId: "draft", contextFields: [] };
  const forms: FormSearchContent[] = [
    {
      versionId: "draft",
      name: "Assessment",
      description: "",
      sections: [
        {
          id: "section",
          title: "Scoring",
          description: "",
          fields: [
            {
              key: "merit",
              label: "Technical merit",
              helpText: "Hidden until eligible",
              options: [],
            },
          ],
        },
      ],
    },
  ];
  stage.tasks.push({
    ...task,
    stableKey: "SECOND_REVIEW",
    name: "Second review",
    formBinding: null,
  });
  stage.scoring = [
    { taskStableKey: task.stableKey, aggregation: "SUM", criteria: [] },
    {
      taskStableKey: "SECOND_REVIEW",
      aggregation: "SUM",
      criteria: [
        {
          stableKey: "legacy",
          criterion: "Legacy score",
          description: "Legacy merit",
          scaleMinimum: 0,
          scaleMaximum: 5,
          weight: 1,
          mandatoryComment: false,
        },
      ],
    },
  ];
  const entries = workflowSearchEntries(graph, forms);
  function Harness() {
    const [selected, setSelected] = useState<WorkflowSearchMatch | null>(null);
    const selectedStage =
      graph.stages.find((item) => item.stableKey === selected?.stageKey) ??
      graph.stages[0];
    const props = {
      stage: selectedStage,
      stageIndex: graph.stages.indexOf(selectedStage),
      editor: { graph },
      canEdit: false,
      canDelete: false,
      isDeleting: false,
    } as ComponentProps<typeof WorkflowStageDetails>;
    return (
      <WorkflowSearchContext.Provider
        value={{ selected, stageKey: selectedStage.stableKey, forms }}
      >
        <button
          onClick={() =>
            setSelected({
              ...findWorkflowMatches(entries, "Technical merit")[0],
            })
          }
        >
          Find field
        </button>
        <button
          onClick={() =>
            setSelected({ ...findWorkflowMatches(entries, "Legacy merit")[0] })
          }
        >
          Find score
        </button>
        <button onClick={() => setSelected(null)}>Clear match</button>
        <WorkflowStageDetails {...props} />
      </WorkflowSearchContext.Provider>
    );
  }
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<Harness />));
  return container;
}
async function click(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  )!;
  await act(async () => {
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
}
describe("workflow search navigation", () => {
  it("selects the matching stage and Tasks tab, expands the section, focuses and highlights the field", async () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    const container = await mount();
    await click(container, "Find field");
    expect(
      container.querySelector('[role="tab"][aria-selected="true"]')
        ?.textContent,
    ).toBe("Tasks");
    expect(
      [...container.querySelectorAll('[role="tab"]')].some(
        (tab) => tab.textContent === "Forms",
      ),
    ).toBe(false);
    expect(container.querySelectorAll("details[open]").length).toBe(2);
    const mark = container.querySelector("mark");
    expect(mark?.textContent).toBe("Technical merit");
    expect(document.activeElement?.contains(mark)).toBe(true);
    expect(scroll).toHaveBeenCalled();
    await click(container, "Clear match");
    expect(container.querySelector("mark")).toBeNull();
  });
  it("switches from a form result to the correct legacy scoring tab and highlights its description", async () => {
    const container = await mount();
    await click(container, "Find field");
    await click(container, "Find score");
    expect(
      container.querySelector('[role="tab"][aria-selected="true"]')
        ?.textContent,
    ).toBe("Scoring");
    expect(container.querySelector("mark")?.textContent).toBe("Legacy merit");
  });
});
