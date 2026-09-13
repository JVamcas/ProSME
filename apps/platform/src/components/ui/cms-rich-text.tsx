import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";

export function CmsRichText({ data }: { data: SerializedEditorState }) {
  return <RichText className="cms-rich-text" data={data} />;
}
