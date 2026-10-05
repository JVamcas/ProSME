import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  modified: true,
  processing: false,
  backgroundProcessing: false,
  initializing: false,
  disabled: false,
  submit: vi.fn(),
  document: {
    globalSlug: "homepage",
    hasSavePermission: true,
    hasPublishPermission: true,
    hasPublishedDoc: true,
    unpublishedVersionCount: 0,
    uploadStatus: "idle",
    setUnpublishedVersionCount: vi.fn(),
    setMostRecentVersionIsAutosaved: vi.fn(),
    setHasPublishedDoc: vi.fn(),
  },
  hotkey: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useDocumentInfo: () => editor.document,
  useForm: () => ({ disabled: editor.disabled, submit: editor.submit }),
  useFormModified: () => editor.modified,
  useFormProcessing: () => editor.processing,
  useFormBackgroundProcessing: () => editor.backgroundProcessing,
  useFormInitializing: () => editor.initializing,
  useLocale: () => ({ code: "en" }),
  useOperation: () => "update",
  useEditDepth: () => 0,
  useHotkey: (...args: unknown[]) => editor.hotkey(...args),
  useTranslation: () => ({
    t: (key: string) => key === "version:saveDraft"
      ? "Save Draft"
      : "Publish changes",
  }),
}));

import { GeneralButton } from "@/components/ui/button";
import {
  CmsPublishButton,
  CmsSaveButton,
  CmsSaveDraftButton,
} from "@/modules/content/ui/admin/CmsDocumentButtons";
import { useCmsDocumentActions } from "@/modules/content/ui/admin/useCmsDocumentActions";

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(editor, {
    modified: true,
    processing: false,
    backgroundProcessing: false,
    initializing: false,
    disabled: false,
  });
  Object.assign(editor.document, {
    hasSavePermission: true,
    hasPublishPermission: true,
    hasPublishedDoc: true,
    unpublishedVersionCount: 0,
    uploadStatus: "idle",
  });
  editor.submit.mockResolvedValue({ doc: {} });
});

describe("CMS document actions", () => {
  it("renders the existing app button with its brand variants", () => {
    expect(CmsSaveButton()?.type).toBe(GeneralButton);
    expect(CmsSaveDraftButton()?.type).toBe(GeneralButton);
    expect(CmsPublishButton()?.type).toBe(GeneralButton);
    expect(renderToStaticMarkup(<CmsSaveDraftButton />)).toContain("rounded-full");
    expect(renderToStaticMarkup(<CmsPublishButton />)).toContain("bg-brand-orange");
  });

  it("saves media through the native Payload form action without draft overrides", async () => {
    CmsSaveButton();
    const shortcut = editor.hotkey.mock.calls[0][1];
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    shortcut(event);
    await Promise.resolve();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(editor.submit).toHaveBeenCalledWith();
    expect(editor.document.setUnpublishedVersionCount).not.toHaveBeenCalled();
  });

  it("saves drafts through Payload and preserves the save shortcut", async () => {
    CmsSaveDraftButton();
    const shortcut = editor.hotkey.mock.calls[0][1];
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    shortcut(event);
    await Promise.resolve();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(editor.submit).toHaveBeenCalledWith({
      action: "/api/globals/homepage?depth=0&locale=en&draft=true&fallback-locale=null",
      method: "POST",
      overrides: { _status: "draft" },
      skipValidation: true,
    });
    const increment = editor.document.setUnpublishedVersionCount.mock.calls[0][0];
    expect(increment(2)).toBe(3);
    expect(editor.document.setHasPublishedDoc).not.toHaveBeenCalled();
  });

  it("publishes with Payload validation and updates version state on success", async () => {
    await useCmsDocumentActions().publish();
    expect(editor.submit).toHaveBeenCalledWith({
      action: "/api/globals/homepage?depth=0&locale=en",
      overrides: { _status: "published" },
    });
    expect(editor.document.setUnpublishedVersionCount).toHaveBeenCalledWith(0);
    expect(editor.document.setMostRecentVersionIsAutosaved).toHaveBeenCalledWith(false);
    expect(editor.document.setHasPublishedDoc).toHaveBeenCalledWith(true);
  });

  it("does not change document state after a failed submission", async () => {
    editor.submit.mockResolvedValue(undefined);
    await useCmsDocumentActions().saveDraft();
    await useCmsDocumentActions().publish();
    expect(editor.document.setUnpublishedVersionCount).not.toHaveBeenCalled();
    expect(editor.document.setHasPublishedDoc).not.toHaveBeenCalled();
  });

  it("hides unauthorized actions and prevents programmatic submission", async () => {
    editor.document.hasSavePermission = false;
    editor.document.hasPublishPermission = false;
    expect(CmsSaveDraftButton()).toBeNull();
    expect(CmsPublishButton()).toBeNull();
    expect(CmsSaveButton()).toBeNull();
    await useCmsDocumentActions().saveDraft();
    await useCmsDocumentActions().publish();
    await useCmsDocumentActions().save();
    expect(editor.submit).not.toHaveBeenCalled();
  });

  it.each([
    "processing", "backgroundProcessing", "initializing", "disabled",
  ] as const)("blocks both actions while %s", async (flag) => {
    editor[flag] = true;
    await useCmsDocumentActions().saveDraft();
    await useCmsDocumentActions().publish();
    await useCmsDocumentActions().save();
    expect(editor.submit).not.toHaveBeenCalled();
    expect(CmsSaveDraftButton()?.props.disabled).toBe(true);
    expect(CmsPublishButton()?.props.disabled).toBe(true);
    expect(CmsSaveButton()?.props.disabled).toBe(true);
  });

  it("blocks submission while media uploads and allows publishing saved drafts", async () => {
    editor.document.uploadStatus = "uploading";
    await useCmsDocumentActions().saveDraft();
    await useCmsDocumentActions().publish();
    expect(editor.submit).not.toHaveBeenCalled();
    editor.document.uploadStatus = "idle";
    editor.modified = false;
    expect(useCmsDocumentActions().canSaveDraft).toBe(false);
    expect(useCmsDocumentActions().canPublish).toBe(false);
    editor.document.unpublishedVersionCount = 1;
    expect(useCmsDocumentActions().canPublish).toBe(true);
  });
});
