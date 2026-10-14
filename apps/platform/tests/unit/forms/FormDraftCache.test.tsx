// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { clientFormsService } from "@/modules/forms/ClientFormsService";
import {
  formQueryKeys,
  useFormEditor,
  useUpdateForm,
} from "@/modules/forms/FormHooks";
import type { FormEditorView } from "@/modules/forms/FormTypes";
import { definition } from "../../support/FormFieldRuleFixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const id = "b0000000-0000-4000-8000-000000000001";
const newestId = "b0000000-0000-4000-8000-000000000002";
const olderId = "b0000000-0000-4000-8000-000000000003";
const runtime = definition();
const version: FormEditorView["version"] = {
  id: newestId,
  formDefinitionId: id,
  versionNumber: 2,
  status: "DRAFT",
  instructions: "",
  displayMode: "STEPS",
  submissionMode: "EXPLICIT",
  submitLabel: "Save",
  rowVersion: 5,
  createdAt: "2026-10-14T10:00:00Z",
  publishedAt: null,
  retiredAt: null,
};
const versions = [version, { ...version, id: olderId, versionNumber: 1 }];
function editor(selectedId: string): FormEditorView {
  return {
    definition: {
      id,
      code: "FORM",
      name: "Form",
      description: "",
      purpose: "APPLICATION_REVIEW",
      active: true,
      updatedAt: version.createdAt,
    },
    version: versions.find((item) => item.id === selectedId)!,
    versions,
    fields: runtime.fields,
    sections: runtime.sections,
    allowedActions: ["UPDATE"],
  };
}
function Harness({ view }: { view: FormEditorView }) {
  useFormEditor(id);
  useFormEditor(id, view.version.id);
  const update = useUpdateForm(id);
  return (
    <button
      onClick={() =>
        update.mutate({
          versionId: view.version.id,
          expectedRowVersion: view.version.rowVersion,
          fields: view.fields,
          sections: view.sections,
          displayMode: view.version.displayMode,
          submitLabel: view.version.submitLabel,
        })
      }
    >
      Save
    </button>
  );
}

describe("draft save cache updates", () => {
  it.each([newestId, olderId])(
    "updates the selected draft without another GET or replacing a different default draft: %s",
    async (selectedId) => {
      const view = editor(selectedId);
      const saved: FormEditorView = {
        ...view,
        fields: [],
        version: { ...view.version, rowVersion: 6 },
        versions: versions.map((item) =>
          item.id === selectedId ? { ...item, rowVersion: 6 } : item,
        ),
      };
      const get = vi.spyOn(clientFormsService, "get");
      const update = vi
        .spyOn(clientFormsService, "update")
        .mockResolvedValue(saved);
      const client = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, retry: false } },
      });
      client.setQueryData(formQueryKeys.detail(id), editor(newestId));
      client.setQueryData(formQueryKeys.version(id, selectedId), view);
      const listKey = formQueryKeys.list({ page: 1, pageSize: 10 });
      client.setQueryData(listKey, { items: [] });
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () =>
          root.render(
            <QueryClientProvider client={client}>
              <Harness view={view} />
            </QueryClientProvider>,
          ),
        );
        await act(async () => container.querySelector("button")!.click());
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });
        expect(update).toHaveBeenCalledOnce();
        expect(get).not.toHaveBeenCalled();
        expect(
          client.getQueryData(formQueryKeys.version(id, selectedId)),
        ).toEqual(saved);
        const defaultEditor = client.getQueryData<FormEditorView>(
          formQueryKeys.detail(id),
        )!;
        expect(defaultEditor.version.id).toBe(newestId);
        expect(defaultEditor.fields).toEqual(
          selectedId === newestId ? saved.fields : view.fields,
        );
        expect(defaultEditor.versions).toEqual(saved.versions);
        expect(
          client.getQueryState(formQueryKeys.version(id, selectedId))!
            .isInvalidated,
        ).toBe(false);
        expect(
          client.getQueryState(formQueryKeys.detail(id))!.isInvalidated,
        ).toBe(false);
        expect(client.getQueryState(listKey)!.isInvalidated).toBe(true);
      } finally {
        await act(async () => root.unmount());
        client.clear();
        container.remove();
        get.mockRestore();
        update.mockRestore();
      }
    },
  );
});
