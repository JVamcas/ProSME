import { RichText } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export function CmsRichText({ data }: { data: SerializedEditorState }) {
  return <RichText data={data} className="cms-rich-text" />;
}
