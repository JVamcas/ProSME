// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import {
  workflowQueryKeys,
  useWorkflowEditor,
} from "@/modules/workflows/WorkflowHooks";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { useSaveWorkflowAction } from "@/modules/workflows/ui/definitions/useSaveWorkflowAction";
import { useDeleteWorkflowAction } from "@/modules/workflows/ui/definitions/useDeleteWorkflowAction";
import {
  workflowActionSaveInput,
  workflowActionSaveRecord,
} from "../../../support/WorkflowActionSaveFixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each([
  ["save", false],
  ["delete", false],
  ["save", true],
  ["delete", true],
] as const)(
  "reuses the %s response without refetching the editor (older version: %s)",
  async (operation, olderVersion) => {
    const record = workflowActionSaveRecord();
    const input = workflowActionSaveInput(record);
    const editor: WorkflowEditorView = {
      definition: record.definition,
      version: {
        id: record.version.id,
        number: 1,
        status: "DRAFT",
        rowVersion: 7,
        createdAt: record.version.createdAt.toISOString(),
        publishedAt: null,
        retiredAt: null,
      },
      graph: record.graph,
      validation: { valid: true, errors: [], warnings: [] },
      assignmentOptions: {
        roles: [{ id: "role", label: "Reviewer" }],
        users: [],
      },
      allowedActions: ["UPDATE"],
    };
    const { assignmentOptions, ...response } = editor;
    const updated = {
      ...response,
      version: { ...editor.version, rowVersion: 8 },
    };
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const defaultKey = workflowQueryKeys.detail(record.definition.id);
    const exactKey = workflowQueryKeys.detail(
      record.definition.id,
      record.version.id,
    );
    const latest = olderVersion
      ? {
          ...editor,
          version: { ...editor.version, id: "latest-version", number: 2 },
        }
      : editor;
    client.setQueryData(defaultKey, latest);
    client.setQueryData(exactKey, editor);
    const get = vi
      .spyOn(clientWorkflowService, "getEditor")
      .mockResolvedValue(editor);
    const save = vi
      .spyOn(clientWorkflowService, "saveAction")
      .mockResolvedValue(updated);
    const remove = vi
      .spyOn(clientWorkflowService, "deleteAction")
      .mockResolvedValue(updated);
    function Harness() {
      useWorkflowEditor(record.definition.id);
      useWorkflowEditor(record.definition.id, true, record.version.id);
      const saving = useSaveWorkflowAction(editor);
      const deleting = useDeleteWorkflowAction(editor);
      return (
        <button
          onClick={() => {
            if (operation === "save") saving.mutate(input);
            else
              deleting.mutate({
                stageKey: input.stageKey,
                actionKey: input.action.stableKey,
              });
          }}
        >
          Save
        </button>
      );
    }
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <Harness />
          </QueryClientProvider>,
        ),
      );
      await act(async () => container.querySelector("button")!.click());
      await act(async () => {
        await vi.waitFor(() =>
          expect(
            client.getQueryData<WorkflowEditorView>(exactKey)?.version
              .rowVersion,
          ).toBe(8),
        );
      });
      expect(get).not.toHaveBeenCalled();
      expect(client.getQueryData(defaultKey)).toEqual(
        olderVersion
          ? latest
          : {
              ...updated,
              assignmentOptions,
            },
      );
      expect(client.getQueryData(exactKey)).toEqual({
        ...updated,
        assignmentOptions,
      });
      expect(client.getQueryState(exactKey)?.isInvalidated).toBe(false);
      expect(operation === "save" ? save : remove).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
      client.clear();
      vi.restoreAllMocks();
    }
  },
);
