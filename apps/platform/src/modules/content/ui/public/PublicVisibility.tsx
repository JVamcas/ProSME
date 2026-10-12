import { getPublicPageVisibility } from "../../application/ServerPublicPageVisibilityService";
import { isPublicPageVisible } from "../../domain/PublicPageVisibility";

export async function PublicVisibility({
  pageKey,
  children,
}: {
  pageKey: string;
  children: React.ReactNode;
}) {
  const visibility = await getPublicPageVisibility();
  return isPublicPageVisible(visibility, pageKey) ? children : null;
}
