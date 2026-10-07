"use client";

import { useEditDepth, useFormFields, useStepNav } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import { useEffect } from "react";

import { ContactDetailsCards } from "../public/ContactDetailsCards";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";

const editor = { anchor: "contact-details", title: "Contact Us" };

export default function CmsContactDetailsGroupField(props: GroupFieldClientProps) {
  const contact = useFormFields(([fields]) => ({
    email: typeof fields.email?.value === "string" ? fields.email.value : "",
    address: typeof fields.address?.value === "string" ? fields.address.value : "",
    phone: typeof fields.phone?.value === "string" ? fields.phone.value : "",
    officeHours:
      typeof fields.officeHours?.value === "string" ? fields.officeHours.value : "",
  }));
  const depth = useEditDepth();
  const { stepNav, setStepNav } = useStepNav();

  useEffect(() => {
    if (depth !== 1) return;
    if (
      stepNav.length === 1 &&
      stepNav[0]?.label === editor.title &&
      stepNav[0]?.url === "/cms/contact"
    ) {
      return;
    }
    setStepNav([{ label: editor.title, url: "/cms/contact" }]);
  }, [depth, setStepNav, stepNav]);

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={editor}
      description="Edit the contact details shown on Contact Us. Save a draft or publish using the page controls."
      previewLabel="Live contact details preview"
    >
      <div className="bg-brand-cream/30 p-5">
        <div className="max-w-sm">
          <ContactDetailsCards contact={contact} />
        </div>
      </div>
    </CmsHomeSectionGroupField>
  );
}
