import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import {
  RichText,
  type JSXConvertersFunction,
} from "@payloadcms/richtext-lexical/react";

import { media } from "../../infrastructure/ContentProjection";
import { CmsImage } from "./CmsImage";

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: (args) => {
    const { node } = args;
    const defaultUpload = defaultConverters.upload;
    const renderDefaultUpload = () =>
      typeof defaultUpload === "function"
        ? defaultUpload(args)
        : defaultUpload;

    if (node.relationTo !== "media") {
      return renderDefaultUpload();
    }

    const value = node.value;
    if (
      !value ||
      typeof value !== "object" ||
      typeof value.url !== "string" ||
      typeof value.mimeType !== "string" ||
      !value.mimeType.startsWith("image/")
    ) {
      return renderDefaultUpload();
    }

    const image = media(value);
    if (!image) {
      return renderDefaultUpload();
    }

    image.alt = node.fields?.alt || image.alt;

    return <CmsImage className="h-auto max-w-full" image={image} />;
  },
});

export function CmsRichText({ data }: { data: SerializedEditorState }) {
  return (
    <RichText className="cms-rich-text" converters={converters} data={data} />
  );
}
