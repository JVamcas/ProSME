// @vitest-environment happy-dom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { DocumentViewClientProps, FormState } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  pathname: "/cms/home/action-cards",
  dispatchFields: vi.fn(),
  getFields: vi.fn(),
  getFormState: vi.fn(),
  scopedConfig: undefined as unknown,
  scopedFunctions: undefined as unknown,
}));

const initialState = {
  title: { value: "Banner headline", valid: true },
  "actionCards.fundingTitle": { value: "Funding", valid: true },
  reviewStatus: { value: "draft", valid: true },
  _status: { value: "draft", valid: true },
} as FormState;

vi.mock("next/navigation", () => ({ usePathname: () => editor.pathname }));
vi.mock("@payloadcms/ui", async () => {
  const { createContext, useContext } = await import("react");
  const functions = { getFormState: editor.getFormState };
  const ServerFunctionsContext = createContext(functions);
  const config = {
    globals: [
      {
        slug: "homepage",
        fields: [
          { type: "group", fields: [{ name: "title", type: "text" }] },
          { name: "actionCards", type: "group", fields: [] },
          { name: "reviewStatus", type: "select" },
          { name: "_status", type: "select" },
        ],
      },
    ],
    collections: [{ slug: "media", fields: [{ name: "alt", type: "text" }] }],
  };
  return {
    ServerFunctionsContext,
    useServerFunctions: () => useContext(ServerFunctionsContext),
    useConfig: () => ({ config }),
    ConfigProvider: ({
      children,
      config: scoped,
    }: {
      children: ReactNode;
      config: unknown;
    }) => {
      editor.scopedConfig = scoped;
      return children;
    },
    DefaultEditView: ({ BeforeDocumentControls }: DocumentViewClientProps) => {
      editor.scopedFunctions = useContext(ServerFunctionsContext);
      return <main>{BeforeDocumentControls}</main>;
    },
    useForm: () => ({
      dispatchFields: editor.dispatchFields,
      getFields: editor.getFields,
    }),
    useFormFields: (selector: (args: [FormState]) => unknown) =>
      selector([initialState]),
  };
});

import CmsHomeSectionEditView from "@/modules/content/ui/admin/CmsHomeSectionEditView";

beforeEach(() => {
  vi.clearAllMocks();
  editor.pathname = "/cms/home/action-cards";
  editor.getFields.mockReturnValue(initialState);
  editor.getFormState.mockResolvedValue({ state: {} });
});
afterEach(() => document.body.replaceChildren());

async function renderEditor() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <CmsHomeSectionEditView
        documentSubViewType="default"
        formState={initialState}
        viewType="document"
        BeforeDocumentControls={<span>Existing native controls</span>}
      />,
    ),
  );
  return { container, root };
}

describe("native homepage section edit view", () => {
  it("removes sibling values before interaction and retains native controls", async () => {
    const { container, root } = await renderEditor();
    expect(editor.dispatchFields).toHaveBeenCalledWith({
      type: "REPLACE_STATE",
      state: {
        "actionCards.fundingTitle": initialState["actionCards.fundingTitle"],
        _status: initialState._status,
      },
    });
    expect(container.textContent).toContain("Existing native controls");
    await act(async () => root.unmount());
  });

  it("keeps validation and post-save form state scoped while leaving media complete", async () => {
    const { root } = await renderEditor();
    const functions = editor.scopedFunctions as {
      getFormState: (args: unknown) => Promise<unknown>;
    };
    await functions.getFormState({
      globalSlug: "homepage",
      renderAllFields: false,
    });
    expect(editor.getFormState).toHaveBeenLastCalledWith({
      globalSlug: "homepage",
      renderAllFields: false,
      select: { actionCards: true, _status: true },
    });
    const mediaArgs = { collectionSlug: "media", id: 165 };
    await functions.getFormState(mediaArgs);
    expect(editor.getFormState).toHaveBeenLastCalledWith(mediaArgs);
    expect(editor.scopedConfig).toMatchObject({
      collections: [{ slug: "media", fields: [{ name: "alt" }] }],
      globals: [
        {
          fields: [
            { admin: { hidden: true } },
            { name: "actionCards" },
            { name: "reviewStatus", admin: { hidden: true } },
            { name: "_status" },
          ],
        },
      ],
    });
    await act(async () => root.unmount());
  });
});
