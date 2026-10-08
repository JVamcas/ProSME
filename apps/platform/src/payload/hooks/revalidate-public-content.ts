import { revalidatePath, revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";
import { fundingOverviewSection } from "@/modules/content/FundingOverviewSections";
import { publishedContentTag } from "@/modules/content/domain/PublishedContentPolicy";

const roots: Record<string, string> = {
  events: "/events",
  faqs: "/faq",
  news: "/news",
  resources: "/resources",
};

function revalidate(source: string, paths: string[], layout = false) {
  try {
    // Expire immediately: unpublishes/deletions must not serve a stale result.
    // Next applies queued invalidation after this request's writes have finished.
    revalidateTag(publishedContentTag(source), { expire: 0 });
    if (layout) revalidatePath("/(public)", "layout");
    for (const path of new Set(["/", "/sitemap.xml", ...paths])) {
      revalidatePath(path);
    }
  } catch (error) {
    // Payload scripts have no Next request cache. Unexpected runtime failures
    // must propagate so a publication cannot silently retain cached content.
    if (
      error instanceof Error &&
      error.message.startsWith("Invariant: static generation store missing")
    ) {
      return;
    }
    throw error;
  }
}

export const revalidateCollection: CollectionAfterChangeHook = ({
  collection,
  doc,
  previousDoc,
  req,
}) => {
  if (req.context?.skipRevalidation) return doc;
  const root = roots[collection.slug];
  const slug = typeof doc.slug === "string" ? doc.slug : undefined;
  const previousSlug =
    typeof previousDoc?.slug === "string" ? previousDoc.slug : undefined;
  revalidate(
    collection.slug,
    [
      ...collectionPaths(collection.slug, slug, root),
      ...collectionPaths(collection.slug, previousSlug, root),
    ],
    collection.slug === "media",
  );
  return doc;
};

export const revalidateCollectionDelete: CollectionAfterDeleteHook = ({
  collection,
  doc,
  req,
}) => {
  if (req.context?.skipRevalidation) return doc;
  const root = roots[collection.slug];
  const slug = typeof doc.slug === "string" ? doc.slug : undefined;
  revalidate(
    collection.slug,
    collectionPaths(collection.slug, slug, root),
    collection.slug === "media",
  );
  return doc;
};

function collectionPaths(collection: string, slug?: string, root?: string) {
  const paths = [
    root,
    root && slug ? `${root}/${slug}` : undefined,
    collection === "pages" && slug ? `/${slug}` : undefined,
  ];
  if (
    collection === "eligibility-content" ||
    (collection === "pages" &&
      (slug === "funding" ||
        slug === "eligibility" ||
        fundingOverviewSection(slug)))
  ) {
    paths.push("/how-to-apply/funding", "/how-to-apply/eligibility");
  }
  return paths.filter((path): path is string => Boolean(path));
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, global, req }) => {
  if (req.context?.skipRevalidation) return doc;
  // Header/footer/settings/contact are shared by every public route.
  const paths = global.slug === "site-settings" ? ["/robots.txt"] : [];
  revalidate(global.slug, paths, true);
  return doc;
};
