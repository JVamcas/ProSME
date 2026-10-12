import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { SerializedUploadNode } from "@payloadcms/richtext-lexical";
import type { ComponentType } from "react";
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

export type CmsRichTextUploadProps = { node: SerializedUploadNode };

export function CmsRichText({
  data,
  MediaUpload,
}: {
  data: SerializedEditorState;
  MediaUpload?: ComponentType<CmsRichTextUploadProps>;
}) {
  const renderConverters: JSXConvertersFunction = (args) => {
    const defaults = converters(args);
    if (!MediaUpload) return defaults;

    return {
      ...defaults,
      upload: (uploadArgs) => {
        if (uploadArgs.node.relationTo === "media") {
          return <MediaUpload node={uploadArgs.node} />;
        }
        const renderUpload = defaults.upload;
        return typeof renderUpload === "function"
          ? renderUpload(uploadArgs)
          : renderUpload;
      },
    };
  };

  return (
    <RichText className="cms-rich-text" converters={renderConverters} data={data} />
  );
}
