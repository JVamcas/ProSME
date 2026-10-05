"use client";

import {
  useConfig,
  useDocumentInfo,
  useForm,
  useFormBackgroundProcessing,
  useFormInitializing,
  useFormModified,
  useFormProcessing,
  useLocale,
  useOperation,
} from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// Payload owns submission and validation; these actions support the Home
// editor's standard drafts configuration (without autosave or scheduling).
export function useCmsDocumentActions() {
  const { config } = useConfig();
  const document = useDocumentInfo();
  const { disabled, submit } = useForm();
  const modified = useFormModified();
  const processing = useFormProcessing();
  const backgroundProcessing = useFormBackgroundProcessing();
  const initializing = useFormInitializing();
  const operation = useOperation();
  const { code: locale } = useLocale();
  const busy = processing || backgroundProcessing;
  const blocked =
    disabled || initializing || busy || document.uploadStatus === "uploading";
  const canSave =
    Boolean(document.hasSavePermission) &&
    !blocked &&
    (operation !== "update" || modified);
  const canSaveDraft = canSave;
  const canPublish =
    Boolean(document.hasPublishPermission) &&
    !blocked &&
    (modified || document.unpublishedVersionCount > 0 || !document.hasPublishedDoc);
  const resourcePath: `/${string}` = document.globalSlug
    ? `/globals/${document.globalSlug}`
    : `/${document.collectionSlug}${document.id ? `/${document.id}` : ""}`;

  function actionUrl(draft: boolean) {
    const params = new URLSearchParams({ depth: "0", locale: locale ?? "" });
    if (draft) {
      params.set("draft", "true");
      params.set("fallback-locale", "null");
    }
    return formatAdminURL({
      apiRoute: config.routes.api,
      path: `${resourcePath}?${params}`,
    });
  }

  async function saveDraft() {
    if (!canSaveDraft) return;
    const result = await submit({
      action: actionUrl(true),
      method: document.collectionSlug && document.id ? "PATCH" : "POST",
      overrides: { _status: "draft" },
      skipValidation: true,
    });
    if (result) {
      document.setUnpublishedVersionCount((count) => count + 1);
    }
  }

  async function save() {
    if (!canSave) return;
    await submit();
  }

  async function publish() {
    if (!canPublish) return;
    const result = await submit({
      action: actionUrl(false),
      overrides: { _status: "published" },
    });
    if (result) {
      document.setUnpublishedVersionCount(0);
      document.setMostRecentVersionIsAutosaved(false);
      document.setHasPublishedDoc(true);
    }
  }

  return {
    busy,
    canSave,
    canSaveDraft,
    canPublish,
    hasSavePermission: document.hasSavePermission,
    hasPublishPermission: document.hasPublishPermission,
    save,
    saveDraft,
    publish,
  };
}
