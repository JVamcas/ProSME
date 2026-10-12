"use client";

import { Upload } from "lucide-react";
import { GeneralButton } from "@/shared/ui/Button";
import { useCmsDocumentActions } from "./useCmsDocumentActions";
import styles from "./CmsEventEditor.module.css";

export default function CmsEventPublishButton() {
  const actions = useCmsDocumentActions();
  if (!actions.hasPublishPermission) return null;

  return (
    <GeneralButton
      type="button"
      variant="primary"
      className={styles.button}
      disabled={!actions.canPublish}
      aria-busy={actions.busy}
      onClick={() => void actions.publish()}
    >
      <Upload size={16} aria-hidden="true" />
      Publish
    </GeneralButton>
  );
}
