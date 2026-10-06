import { FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import type { Field } from "payload";

import { resourceDocumentMimeTypes } from "@/modules/content/ResourceDocumentTypes";
import { withAppFormInputs } from "./withAppFormInputs";

const contentFields: Field[] = [
  {
    name: "resourceName",
    label: "Resource name",
    type: "text",
    required: true,
  },
  {
    name: "title",
    type: "text",
    required: true,
  },
  {
    name: "slug",
    type: "text",
    required: true,
    unique: true,
    index: true,
    admin: {
      description: "Generated from the title when left blank. Keep it stable once published.",
    },
  },
  {
    name: "description",
    type: "textarea",
    required: true,
  },
  {
    name: "body",
    label: "Resource content",
    type: "richText",
    editor: lexicalEditor({
      features: ({ defaultFeatures }) => [...defaultFeatures, FixedToolbarFeature()],
    }),
  },
  {
    name: "file",
    label: "Document",
    type: "upload",
    relationTo: "media",
    filterOptions: { mimeType: { in: [...resourceDocumentMimeTypes] } },
    admin: {
      description: "Upload DOC, DOCX, PDF, XLS, XLSX, JPEG or PNG. A preview is generated automatically.",
    },
  },
  {
    name: "thumbnail",
    label: "Custom thumbnail (optional)",
    type: "upload",
    relationTo: "media",
    filterOptions: { mimeType: { contains: "image/" } },
    admin: {
      description: "Overrides the document preview. Remove it to use the automatic preview again.",
    },
  },
  {
    name: "externalUrl",
    label: "Existing document link (optional)",
    type: "text",
    validate: (value: string | null | undefined) => {
      if (
        !value ||
        /^https?:\/\/\S+$/i.test(value) ||
        /^\/(?!\/)[^\s\\]*$/.test(value)
      ) {
        return true;
      }
      return "Use an HTTPS/HTTP link or a path starting with a single slash.";
    },
    admin: {
      description: "An uploaded document takes priority over this link.",
    },
  },
];

// An unnamed group retains existing document paths and native Payload editing.
export const resourceContentFields: Field[] = [
  {
    type: "group",
    label: "Resource",
    admin: {
      components: {
        Field: "./modules/content/ui/admin/CmsResourceContentGroupField.tsx",
      },
    },
    fields: contentFields.map(withAppFormInputs),
  },
];
