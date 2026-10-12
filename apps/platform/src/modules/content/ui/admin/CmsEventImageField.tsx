"use client";

import { UploadField } from "@payloadcms/ui";
import type { UploadFieldClientProps } from "payload";

export default function CmsEventImageField(props: UploadFieldClientProps) {
  return <UploadField {...props} />;
}
