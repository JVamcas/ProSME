import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  submit: vi.fn(),
  modified: true,
  processing: false,
  document: {
    id: 42,
    collectionSlug: "events",
    globalSlug: undefined,
    hasSavePermission: true,
    hasPublishPermission: false,
    uploadStatus: undefined,
    unpublishedVersionCount: 1,
    hasPublishedDoc: true,
    setUnpublishedVersionCount: vi.fn(),
    setMostRecentVersionIsAutosaved: vi.fn(),
    setHasPublishedDoc: vi.fn(),
  },
}));
vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useDocumentInfo: () => fixture.document,
  useForm: () => ({ disabled: false, submit: fixture.submit }),
  useFormBackgroundProcessing: () => false,
  useFormInitializing: () => false,
  useFormModified: () => fixture.modified,
  useFormProcessing: () => fixture.processing,
  useLocale: () => ({ code: "en" }),
  useOperation: () => "update",
}));
import { useCmsDocumentActions } from "@/modules/content/ui/admin/useCmsDocumentActions";

beforeEach(() => {
  vi.clearAllMocks();
  fixture.submit.mockResolvedValue({ doc: { id: 42 } });
  fixture.modified = true;
  fixture.processing = false;
  fixture.document.hasSavePermission = true;
  fixture.document.hasPublishPermission = false;
});

describe("CMS event native document actions", () => {
  it("saves drafts through Payload's version endpoint", async () => {
    await useCmsDocumentActions().saveDraft();
    expect(fixture.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PATCH",
        overrides: { _status: "draft" },
        skipValidation: true,
      }),
    );
    expect(fixture.submit.mock.calls[0][0].action).toContain("/events/42?");
    expect(fixture.submit.mock.calls[0][0].action).toContain("draft=true");
  });

  it("submits a validated draft for review without overwriting the published document", async () => {
    fixture.modified = false;
    const actions = useCmsDocumentActions();
    expect(actions.canSubmitForReview).toBe(true);
    await actions.submitForReview();
    expect(fixture.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PATCH",
        overrides: { _status: "draft", reviewStatus: "inReview" },
      }),
    );
    expect(fixture.submit.mock.calls[0][0]).not.toHaveProperty(
      "skipValidation",
    );
    expect(fixture.submit.mock.calls[0][0].action).toContain("draft=true");
  });

  it("blocks duplicate actions during submission and denies read-only users", async () => {
    fixture.processing = true;
    await useCmsDocumentActions().submitForReview();
    expect(fixture.submit).not.toHaveBeenCalled();
    fixture.processing = false;
    fixture.document.hasSavePermission = false;
    await useCmsDocumentActions().submitForReview();
    expect(fixture.submit).not.toHaveBeenCalled();
  });

  it("does not publish without Payload publishing permission", async () => {
    await useCmsDocumentActions().publish();
    expect(fixture.submit).not.toHaveBeenCalled();
    fixture.document.hasPublishPermission = true;
    await useCmsDocumentActions().publish();
    expect(fixture.submit.mock.calls[0][0].overrides).toEqual({
      _status: "published",
    });
    expect(fixture.submit.mock.calls[0][0].action).not.toContain("draft=true");
  });
});
