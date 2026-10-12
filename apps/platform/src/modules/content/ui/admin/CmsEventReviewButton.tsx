"use client";

import { GeneralButton } from "@/shared/ui/Button";
import { useCmsDocumentActions } from "./useCmsDocumentActions";

export default function CmsEventReviewButton() {
  const actions = useCmsDocumentActions();
  if (!actions.hasSavePermission) return null;

  return (
    <GeneralButton
      type="button"
      variant="primary"
      disabled={!actions.canSubmitForReview}
      aria-busy={actions.busy}
      onClick={() => void actions.submitForReview()}
    >
      Submit for review
    </GeneralButton>
  );
}
