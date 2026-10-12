import { requirePublicPage } from "../../application/ServerPublicPageVisibilityService";

export async function PublicPageBoundary({
  pageKey,
  children,
}: {
  pageKey: string;
  children: React.ReactNode;
}) {
  await requirePublicPage(pageKey);
  return children;
}
