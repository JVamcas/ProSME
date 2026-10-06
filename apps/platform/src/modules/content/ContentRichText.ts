import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

type RichTextContent = SerializedEditorState & Record<string, unknown>;

export function paragraphsToRichText(
  paragraphs: readonly string[],
): RichTextContent {
  return {
    root: {
      type: "root",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        children: [{ type: "text", text, version: 1 }],
        direction: null,
        format: "",
        indent: 0,
        version: 1,
        textFormat: 0,
        textStyle: "",
      })),
      direction: null,
      format: "",
      indent: 0,
      version: 1,
    },
  };
}
