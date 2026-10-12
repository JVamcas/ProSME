"use client";

import { GroupField, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import { Eye, Save, UserRound } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { GeneralButton, GeneralButtonLink } from "@/shared/ui/Button";
import { eventPreviewUrl } from "@/modules/content/EventPreviewUrl";
import CmsEventPublishButton from "./CmsEventPublishButton";
import { useCmsDocumentActions } from "./useCmsDocumentActions";
import styles from "./CmsEventEditor.module.css";

function savedDate(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    return null;
  return new Intl.DateTimeFormat("en-NA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CmsEventContentGroupField(
  props: GroupFieldClientProps,
) {
  const document = useDocumentInfo();
  const actions = useCmsDocumentActions();
  const values = useFormFields(([fields]) => ({
    slug: fields.slug?.value,
    status: fields._status?.value,
  }));
  const status = values.status === "published" ? "Published" : "Draft";
  const slug = typeof values.slug === "string" ? values.slug : "";
  const created = savedDate(document.initialData?.createdAt);
  const updated = savedDate(document.initialData?.updatedAt);

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1>Edit event</h1>
          <Badge variant="subtle">{status}</Badge>
        </div>
        <div className={styles.actions}>
          {slug ? (
            <GeneralButtonLink
              href={eventPreviewUrl({ slug })}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              className={styles.button}
            >
              <Eye size={16} aria-hidden="true" />
              Preview
            </GeneralButtonLink>
          ) : (
            <GeneralButton variant="outline" disabled className={styles.button}>
              <Eye size={16} aria-hidden="true" />
              Preview
            </GeneralButton>
          )}
          <CmsEventPublishButton />
        </div>
      </header>
      <div className={styles.editorFields}>
        <GroupField {...props} />
      </div>
      <footer className={styles.footer}>
        <div className={styles.editorial}>
          <UserRound size={18} aria-hidden="true" />
          <strong>Editorial</strong>
          <span>
            {created ? `Created ${created}` : "New event"}
            {updated ? ` · Last updated ${updated}` : ""}
          </span>
        </div>
        {actions.hasSavePermission ? (
          <GeneralButton
            variant="primary"
            className={styles.button}
            disabled={!actions.canSaveDraft}
            aria-busy={actions.busy}
            onClick={() => void actions.saveDraft()}
          >
            <Save size={16} aria-hidden="true" />
            Save draft
          </GeneralButton>
        ) : null}
      </footer>
    </div>
  );
}
