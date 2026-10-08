export const PUBLISHED_CONTENT_REVALIDATE_SECONDS = 300;

export function publishedContentTag(source: string) {
  return `cms-published:${source}`;
}
