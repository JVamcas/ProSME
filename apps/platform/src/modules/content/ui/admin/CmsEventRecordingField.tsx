"use client";

import { GroupField } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import { Info, Video } from "lucide-react";
import styles from "./CmsEventEditor.module.css";

export default function CmsEventRecordingField(props: GroupFieldClientProps) {
  return (
    <section className={`${styles.panel} ${styles.recording}`}>
      <h2>
        <Video size={20} aria-hidden="true" />
        Recording
      </h2>
      <GroupField {...props} />
      <p className={styles.guidance}>
        <Info size={15} aria-hidden="true" />
        Publish after the session.
      </p>
    </section>
  );
}
