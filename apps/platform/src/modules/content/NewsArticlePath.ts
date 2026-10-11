export function newsArticleHref(id: number | string) {
  return `/news/${encodeURIComponent(String(id))}`;
}
