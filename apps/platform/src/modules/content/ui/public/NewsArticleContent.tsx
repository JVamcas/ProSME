import type { ComponentType } from "react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";

import { CmsRichText, type CmsRichTextUploadProps } from "./CmsRichText";
import { NewsArticleBlock, type ArticleImageProps } from "./NewsArticleBlock";
import styles from "./NewsArticleContent.module.css";

export function NewsArticleContent({
  data,
  Image,
  MediaUpload,
}: {
  data: SerializedEditorState;
  Image?: ComponentType<ArticleImageProps>;
  MediaUpload?: ComponentType<CmsRichTextUploadProps>;
}) {
  const converters: JSXConvertersFunction = () => {
    const renderBlock = ({ node }: { node: { fields: Record<string, unknown> } }) => (
      <NewsArticleBlock fields={node.fields} Image={Image} MediaUpload={MediaUpload} />
    );
    return {
      blocks: {
        articleTextImage: renderBlock,
        articleColumns: renderBlock,
        articleImage: renderBlock,
        articleButton: renderBlock,
      },
    };
  };

  return (
    <div className={styles.article}>
      <CmsRichText data={data} MediaUpload={MediaUpload} additionalConverters={converters} />
    </div>
  );
}
