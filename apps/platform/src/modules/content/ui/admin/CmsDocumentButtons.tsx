"use client";

import { useEditDepth, useHotkey, useTranslation } from "@payloadcms/ui";

import { GeneralButton } from "@/components/ui/button";
import { useCmsDocumentActions } from "./useCmsDocumentActions";

export function CmsSaveButton() {
  const actions = useCmsDocumentActions();
  const editDepth = useEditDepth();
  const { t } = useTranslation();

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ["s"] }, (event) => {
    event.preventDefault();
    event.stopPropagation();
    void actions.save();
  });

  if (!actions.hasSavePermission) return null;

  return (
    <GeneralButton
      id="action-save"
      variant="primary"
      disabled={!actions.canSave}
      aria-busy={actions.busy}
      onClick={() => void actions.save()}
    >
      {t("general:save")}
    </GeneralButton>
  );
}

export function CmsSaveDraftButton() {
  const actions = useCmsDocumentActions();
  const editDepth = useEditDepth();
  const { t } = useTranslation();

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ["s"] }, (event) => {
    event.preventDefault();
    event.stopPropagation();
    void actions.saveDraft();
  });

  if (!actions.hasSavePermission) return null;

  return (
    <GeneralButton
      id="action-save-draft"
      variant="outline"
      className="border-solid"
      disabled={!actions.canSaveDraft}
      aria-busy={actions.busy}
      onClick={() => void actions.saveDraft()}
    >
      {t("version:saveDraft")}
    </GeneralButton>
  );
}

export function CmsPublishButton() {
  const actions = useCmsDocumentActions();
  const { t } = useTranslation();

  if (!actions.hasPublishPermission) return null;

  return (
    <GeneralButton
      id="action-save"
      variant="primary"
      disabled={!actions.canPublish}
      aria-busy={actions.busy}
      onClick={() => void actions.publish()}
    >
      {t("version:publishChanges")}
    </GeneralButton>
  );
}
