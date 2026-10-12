"use client";

import { DefaultEditView } from "@payloadcms/ui";
import type { DocumentViewClientProps } from "payload";
import styles from "./CmsPublicPageVisibility.module.css";

export default function CmsPublicPageVisibilityEditView(
  props: DocumentViewClientProps,
) {
  return (
    <div className={styles.editor}>
      <DefaultEditView {...props} />
    </div>
  );
}
