"use client";

import { GroupField, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import { Files } from "lucide-react";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import styles from "./CmsEventEditor.module.css";

export default function CmsEventPublicationField(props: GroupFieldClientProps) {
  const document = useDocumentInfo();
  const status = useFormFields(([fields]) => fields._status?.value);

  const saved = document.lastUpdateTime
    ? new Intl.DateTimeFormat("en-NA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(document.lastUpdateTime))
    : "Not saved yet";

  return (
    <section className={`${styles.panel} ${styles.publication}`}>
      <h2>
        <Files size={20} aria-hidden="true" />
        Publication
      </h2>
      <GroupField {...props} />
      <div className={styles.publicationRows}>
        <FormSelect
          label="Status"
          name="eventPublicationStatusDisplay"
          items={[
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" },
          ]}
          value={status === "published" ? "published" : "draft"}
          disabled
        />
        <FormInput
          label="Version"
          name="eventVersionDisplay"
          value={document.versionCount}
          readOnly
        />
        <div className={styles.saved}>
          <span>Last saved</span>
          <span>{saved}</span>
        </div>
      </div>
    </section>
  );
}
