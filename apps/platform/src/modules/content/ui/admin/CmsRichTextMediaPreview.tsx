"use client";

import {
  CmsRichText,
  type CmsRichTextUploadProps,
} from "../public/CmsRichText";
import { useCmsMediaRecord } from "./useCmsMediaPreview";

export function CmsRichTextMediaPreview({ node }: CmsRichTextUploadProps) {
  const value = useCmsMediaRecord(node.value);
  if (!value || typeof value !== "object") return null;

  // Resolve editor IDs through Payload, then reuse the public upload renderer.
  const populatedNode = { ...node, value };
  return (
    <CmsRichText
      data={{
        root: {
          type: "root",
          version: 1,
          direction: null,
          format: "",
          indent: 0,
          children: [populatedNode],
        },
      }}
    />
  );
}
