"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { ExternalLink, Info, Users } from "lucide-react";
import { GeneralButton, GeneralButtonLink } from "@/shared/ui/Button";
import styles from "./CmsEventEditor.module.css";

export default function CmsEventRegistrationPanel() {
  const { id } = useDocumentInfo();

  return (
    <section className={styles.panel}>
      <h2>
        <Users size={20} aria-hidden="true" />
        Registration
      </h2>
      <div className={styles.registrationNotice}>
        <Info size={18} aria-hidden="true" />
        <div>
          <strong>Managed in Operations</strong>
          <p>Event registration is handled in the Operations portal.</p>
        </div>
      </div>
      {id ? (
        <GeneralButtonLink
          href={`/admin/events/${id}`}
          variant="outline"
          className={styles.registrationLink}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open registrations
        </GeneralButtonLink>
      ) : (
        <GeneralButton
          variant="outline"
          disabled
          className={styles.registrationLink}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open registrations
        </GeneralButton>
      )}
    </section>
  );
}
