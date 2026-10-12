export function eventPreviewUrl({ slug }: { slug?: string | null }) {
  const path = slug ? `/events/${slug}` : "/events";
  return `/api/preview?path=${encodeURIComponent(path)}`;
}
