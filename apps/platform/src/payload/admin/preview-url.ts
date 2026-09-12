const publicPath = (path: string) => `/api/preview?path=${encodeURIComponent(path)}`;

export function pagePreviewUrl({ slug }: { slug?: string | null }) {
  return publicPath(slug ? `/${slug}` : "/");
}

export function newsPreviewUrl({ slug }: { slug?: string | null }) {
  return publicPath(slug ? `/news/${slug}` : "/news");
}

export function eventPreviewUrl({ slug }: { slug?: string | null }) {
  return publicPath(slug ? `/events/${slug}` : "/events");
}

export function fundingPreviewUrl({ slug }: { slug?: string | null }) {
  return publicPath(slug ? `/funding/${slug}` : "/funding");
}

export function resourcePreviewUrl({ slug }: { slug?: string | null }) {
  return publicPath(slug ? `/resources/${slug}` : "/resources");
}

export const homepagePreviewUrl = () => publicPath("/");
