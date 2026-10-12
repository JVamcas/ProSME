"use client";

import { DefaultEditView } from "@payloadcms/ui";
import type { DocumentViewClientProps } from "payload";
import styles from "./CmsEventEditor.module.css";

export default function CmsEventEditView(props: DocumentViewClientProps) {
  return (
    <div className={styles.frame}>
      <DefaultEditView {...props} />
    </div>
  );
}
