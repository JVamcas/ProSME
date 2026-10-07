"use client";

import { useFormFields } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import type { ListingItem } from "../../ContentTypes";
import { resourceThumbnail } from "../../infrastructure/ContentProjection";
import { CmsRichText } from "../public/CmsRichText";
import { ResourceCard } from "../public/ResourceCard";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { useCmsMediaPreview, useCmsMediaRecord } from "./useCmsMediaPreview";

export default function CmsResourceContentGroupField(props: GroupFieldClientProps) {
  const values = useFormFields(([fields]) => ({
    name: fields.resourceName?.value,
    title: fields.title?.value,
    slug: fields.slug?.value,
    description: fields.description?.value,
    thumbnail: fields.thumbnail?.value,
    file: fields.file?.value,
    body: fields.body?.value,
  }));
  const thumbnail = useCmsMediaPreview(values.thumbnail);
  const document = useCmsMediaRecord(values.file, 1);
  const item: ListingItem = {
    id: 0,
    category: typeof values.name === "string" ? values.name : "Resource name",
    title: typeof values.title === "string" ? values.title : "Resource title",
    slug: typeof values.slug === "string" ? values.slug : "preview",
    summary: typeof values.description === "string" ? values.description : "",
    image: resourceThumbnail(thumbnail, document),
  };
  const body = values.body as ListingItem["body"];

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={{ anchor: "resource-content", title: "Resource Centre" }}
      description="Edit the resource, upload its document and optionally replace its automatic preview with a custom thumbnail."
      previewLabel="Live resource preview"
    >
      <ResourceCard item={item} />
      {body ? (
        <div className="p-6">
          <CmsRichText data={body} />
        </div>
      ) : null}
    </CmsHomeSectionGroupField>
  );
}
