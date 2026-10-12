import type { ComponentType } from "react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { GeneralButtonAnchor } from "@/shared/ui/Button";

import { articleLink } from "../../domain/ArticleLink";
import { media } from "../../infrastructure/ContentProjection";
import { CmsImage } from "./CmsImage";
import { CmsRichText, type CmsRichTextUploadProps } from "./CmsRichText";
import styles from "./NewsArticleContent.module.css";

export type ArticleImageProps = { value: unknown; alt?: string; sizes?: string };
export type ArticleBlockFields = Record<string, unknown> & { blockType?: string };

export function ArticleImage({ value, alt, sizes }: ArticleImageProps) {
  const image = media(value);
  if (!image) return null;
  return (
    <CmsImage
      image={{ ...image, alt: alt || image.alt }}
      className={styles.image}
      sizes={sizes}
    />
  );
}

function ButtonLink({ label, href }: { label: unknown; href: unknown }) {
  const link = articleLink(href);
  if (!link || typeof label !== "string" || !label.trim()) return null;
  return (
    <GeneralButtonAnchor className={styles.buttonLink} href={link} size="lg">
      {label}
    </GeneralButtonAnchor>
  );
}

function richText(value: unknown): SerializedEditorState | undefined {
  if (!value || typeof value !== "object" || !("root" in value)) return undefined;
  const root = value.root;
  if (!root || typeof root !== "object" || !("children" in root) || !Array.isArray(root.children)) {
    return undefined;
  }
  return value as SerializedEditorState;
}

export function NewsArticleBlock({
  fields,
  Image = ArticleImage,
  MediaUpload,
}: {
  fields: ArticleBlockFields;
  Image?: ComponentType<ArticleImageProps>;
  MediaUpload?: ComponentType<CmsRichTextUploadProps>;
}) {
  const renderText = (value: unknown) => {
    const data = richText(value);
    return data ? <CmsRichText data={data} MediaUpload={MediaUpload} /> : null;
  };
  const figure = (
    <figure className={styles.figure}>
      <Image
        value={fields.image}
        alt={typeof fields.alt === "string" ? fields.alt : ""}
        sizes={fields.blockType === "articleImage" ? "100vw" : undefined}
      />
      {typeof fields.caption === "string" && fields.caption.trim() ? (
        <figcaption className={styles.caption}>{fields.caption}</figcaption>
      ) : null}
    </figure>
  );

  if (fields.blockType === "articleTextImage") {
    const button = fields.button && typeof fields.button === "object"
      ? fields.button as Record<string, unknown>
      : {};
    return (
      <section
        className={styles.columns}
        data-article-layout="text-image"
        data-image-position={fields.imagePosition === "left" ? "left" : "right"}
      >
        <div className={styles.text}>
          {typeof fields.heading === "string" && fields.heading.trim() ? (
            <h2>{fields.heading}</h2>
          ) : null}
          {renderText(fields.content)}
          <ButtonLink label={button.label} href={button.href} />
        </div>
        {figure}
      </section>
    );
  }

  if (fields.blockType === "articleColumns") {
    return (
      <section className={styles.columns} data-article-layout="columns">
        <div className={styles.text}>{renderText(fields.left)}</div>
        <div className={styles.text}>{renderText(fields.right)}</div>
      </section>
    );
  }

  if (fields.blockType === "articleImage") {
    return <div data-article-layout="image">{figure}</div>;
  }

  if (fields.blockType === "articleButton") {
    return (
      <div className={styles.button}>
        <ButtonLink label={fields.label} href={fields.href} />
      </div>
    );
  }
  return null;
}
