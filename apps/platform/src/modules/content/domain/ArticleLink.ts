import { publicKnowledgeUrl } from "./LexicalPlainText";

export function articleLink(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const href = value.trim();
  if (/[\s\\\u0000-\u001f\u007f]/.test(href)) return undefined;
  if (/^\/(?!\/)/.test(href) || /^#[^#]+$/.test(href)) return href;
  return publicKnowledgeUrl(href) ?? undefined;
}

export function validateArticleLink(value: unknown, options?: { required?: boolean }) {
  if (!value) {
    return options?.required ? "Enter a button link." : true;
  }
  if (articleLink(value)) return true;
  return "Use an HTTP/HTTPS URL, a path starting with a single slash, or a page anchor.";
}

