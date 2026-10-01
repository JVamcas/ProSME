// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkflowVisualGraph } from "@/modules/workflows/ui/definitions/WorkflowVisualGraph";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

describe("workflow visual graph", () => {
  it("edits and deletes the clicked stage without selecting or dragging it", async () => {
    const stages = referenceWorkflow.stages.slice(0, 2);
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onSelect = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <WorkflowVisualGraph
            canEdit
            canDelete
            onEdit={onEdit}
            onDelete={onDelete}
            onSelect={onSelect}
            stages={stages}
            transitions={[]}
          />,
        );
      });
      const buttons = Array.from(container.querySelectorAll("button"));
      const edit = buttons.find((button) =>
        button.getAttribute("aria-label") === `Edit ${stages[1].name}`,
      )!;
      const remove = buttons.find((button) =>
        button.getAttribute("aria-label") === `Delete ${stages[1].name}`,
      )!;
      expect(edit.parentElement?.closest("button")).toBeNull();
      expect(remove.parentElement?.closest("button")).toBeNull();
      await act(async () => {
        edit.dispatchEvent(new Event("pointerdown", { bubbles: true }));
        edit.click();
        remove.dispatchEvent(new Event("pointerdown", { bubbles: true }));
        remove.click();
      });
      expect(onEdit).toHaveBeenCalledExactlyOnceWith(stages[1]);
      expect(onDelete).toHaveBeenCalledExactlyOnceWith(stages[1]);
      expect(onSelect).not.toHaveBeenCalled();
      await act(async () => {
        container.querySelector<HTMLButtonElement>('[aria-pressed="false"]')!.click();
      });
      expect(onSelect).toHaveBeenCalledExactlyOnceWith(stages[0].stableKey);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it.each([
    { canEdit: false, canDelete: false, isDeleting: false },
    { canEdit: true, canDelete: false, isDeleting: false },
    { canEdit: true, canDelete: true, isDeleting: true },
  ])("respects stage action availability: %j", (availability) => {
    const stage = referenceWorkflow.stages[0];
    const markup = renderToStaticMarkup(
      <WorkflowVisualGraph
        {...availability}
        onEdit={() => {}}
        onDelete={() => {}}
        onSelect={() => {}}
        stages={[stage]}
        transitions={[]}
      />,
    );
    const buttons = [...markup.matchAll(/<button[^>]*>/g)]
      .map((match) => match[0]);
    const edit = buttons.find((button) => button.includes('aria-label="Edit '))!;
    const remove = buttons.find((button) => button.includes('aria-label="Delete '))!;
    expect(edit.includes('disabled=""')).toBe(!availability.canEdit);
    expect(remove.includes('disabled=""')).toBe(
      !availability.canDelete || availability.isDeleting,
    );
  });

  it("omits stage actions in preview graphs", () => {
    const markup = renderToStaticMarkup(
      <WorkflowVisualGraph
        onSelect={() => {}}
        stages={referenceWorkflow.stages}
        transitions={[]}
      />,
    );
    expect(markup).not.toContain('aria-label="Edit ');
    expect(markup).not.toContain('aria-label="Delete ');
  });

  it.each([
    { actionCount: 3, destinationCount: 1 },
    { actionCount: 1, destinationCount: 2 },
  ])(
    "counts $destinationCount branches for $actionCount action routes",
    ({ actionCount, destinationCount }) => {
      const [source, ...destinations] = referenceWorkflow.stages;
      const markup = renderToStaticMarkup(
        <WorkflowVisualGraph
          onSelect={() => {}}
          stages={[source, ...destinations.slice(0, destinationCount)]}
          transitions={Array.from({ length: actionCount }, (_, index) => ({
            actionKey: `ACTION_${index}`,
            condition: null,
            priority: index + 1,
            sourceStageKey: source.stableKey,
            targetStageKeys: destinations
              .slice(0, destinationCount)
              .map((stage) => stage.stableKey),
          }))}
        />,
      );

      const card = markup.match(/<button[\s\S]*?<\/button>/)?.[0];
      expect(card).toContain(
        `aria-label="${destinationCount} outgoing branches"`,
      );
      expect(markup.match(/marker-end="url\(#workflow-arrow\)"/g)).toHaveLength(
        destinationCount,
      );
    },
  );

  it("shows terminal action paths inside their source card without terminal connectors", () => {
    const stage = referenceWorkflow.stages.at(-1)!;
    const markup = renderToStaticMarkup(
      <WorkflowVisualGraph
        onSelect={() => {}}
        selectedCode={stage.stableKey}
        stages={[stage]}
        transitions={[
          {
            actionKey: "COMPLETE",
            condition: null,
            priority: 1,
            sourceStageKey: stage.stableKey,
            targetStageKeys: [],
            terminalOutcome: "CLOSED_QUALIFIED",
          },
        ]}
      />,
    );

    const card = markup.match(/<button[\s\S]*?<\/button>/)?.[0];
    expect(card).toContain("Complete workflow");
    expect(card).toContain("Closed qualified");
    expect(card).toContain("Ends application");
    expect(card).toContain("bg-violet-50");
    expect(card).toContain("Ends the application&#x27;s active workflow");
    expect(card).toContain('aria-pressed="true"');
    expect(card).toContain('aria-label="0 outgoing branches"');
    expect(markup).not.toContain('marker-end="url(#workflow-arrow)"');
    expect(markup).not.toContain("Routes from");
    expect(markup.match(/Closed qualified/g)).toHaveLength(2); // Row and full-path tooltip.
  });

  it("retains one connector for shared stage destinations and lists every action path", () => {
    const [source, target, parallel] = referenceWorkflow.stages;
    const transitions = [
      {
        actionKey: "ADVANCE",
        condition: null,
        priority: 1,
        sourceStageKey: source.stableKey,
        targetStageKeys: [target.stableKey, parallel.stableKey],
      },
      {
        actionKey: "OVERRIDE",
        condition: {
          id: "11111111-1111-4111-8111-111111111111",
          kind: "GROUP" as const,
          combinator: "AND" as const,
          children: [],
        },
        priority: 2,
        sourceStageKey: source.stableKey,
        targetStageKeys: [target.stableKey],
      },
    ];
    const markup = renderToStaticMarkup(
      <WorkflowVisualGraph
        onSelect={() => {}}
        stages={[source, target, parallel]}
        transitions={transitions}
      />,
    );

    const card = markup.match(/<button[\s\S]*?<\/button>/)?.[0];
    expect(card).toContain("Advance");
    expect(card).toContain("Override");
    expect(card).toContain(`${target.name}, ${parallel.name}`);
    expect(card).toContain("Conditional");
    expect(card).toContain('aria-label="2 outgoing branches"');
    expect(card).not.toContain("Ends application");
    expect(card).not.toContain("bg-violet-50");
    expect(markup.match(/marker-end="url\(#workflow-arrow\)"/g)).toHaveLength(
      2,
    );
    const connectors = [
      ...markup.matchAll(/<g data-workflow-route=[\s\S]*?<\/g>/g),
    ].map((match) => match[0]);
    expect(connectors).toHaveLength(2);
    expect(connectors[0]).toContain("Advance");
    expect(connectors[0]).toContain("Override (Conditional)");
    expect(connectors[1]).toContain("Advance");
    expect(connectors[1]).not.toContain("Override");
  });

  it("labels return paths with the configured action name", () => {
    const [target, source] = referenceWorkflow.stages;
    const markup = renderToStaticMarkup(
      <WorkflowVisualGraph
        onSelect={() => {}}
        stages={[
          target,
          {
            ...source,
            actions: source.actions.map((action, index) =>
              index === 0
                ? { ...action, label: "Return for re-review" }
                : action,
            ),
          },
        ]}
        transitions={[
          {
            actionKey: source.actions[0].stableKey,
            condition: null,
            priority: 1,
            sourceStageKey: source.stableKey,
            targetStageKeys: [target.stableKey],
          },
        ]}
      />,
    );

    const connector = markup.match(/<g data-workflow-route=[\s\S]*?<\/g>/)?.[0];
    expect(connector).toContain("Return for re-review");
    expect(connector).toContain("foreignObject");
  });

  it("highlights conditional terminal outcomes alongside continuing routes", () => {
    const [source, target] = referenceWorkflow.stages;
    const markup = renderToStaticMarkup(
      <WorkflowVisualGraph
        onSelect={() => {}}
        stages={[source, target]}
        transitions={[
          {
            actionKey: "ADVANCE",
            condition: null,
            priority: 1,
            sourceStageKey: source.stableKey,
            targetStageKeys: [target.stableKey],
          },
          {
            actionKey: "RECOVER",
            condition: {
              id: "11111111-1111-4111-8111-111111111111",
              kind: "GROUP",
              combinator: "AND",
              children: [],
            },
            priority: 2,
            sourceStageKey: source.stableKey,
            targetStageKeys: [],
            terminalOutcome: "TERMINATED_RECOVERY",
          },
        ]}
      />,
    );

    expect(markup.match(/Ends application/g)).toHaveLength(1);
    const card = markup.match(/<button[\s\S]*?<\/button>/)?.[0];
    expect(card).toContain('aria-label="1 outgoing branches"');
    expect(markup).toContain("Terminated recovery");
    expect(markup).toContain("Conditional");
    expect(markup.match(/marker-end="url\(#workflow-arrow\)"/g)).toHaveLength(
      1,
    );
  });
});
