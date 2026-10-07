import { revalidatePath } from "next/cache";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from "payload";

const roots: Record<string, string> = {
  events: "/events",
  faqs: "/faq",
  news: "/news",
  resources: "/resources",
};

function revalidate(paths: string[]) {
  try {
    for (const path of new Set(["/", ...paths])) revalidatePath(path);
  } catch {
    // Payload scripts run outside Next.js request/static-generation context.
  }
}

export const revalidateCollection: CollectionAfterChangeHook = ({ collection, doc, req }) => {
  if (req.context?.skipRevalidation) return doc;
  const root = roots[collection.slug];
  const slug = typeof doc.slug === "string" ? doc.slug : undefined;
  revalidate(collectionPaths(collection.slug, slug, root));
  return doc;
};

export const revalidateCollectionDelete: CollectionAfterDeleteHook = ({ collection, doc, req }) => {
  if (req.context?.skipRevalidation) return doc;
  const root = roots[collection.slug];
  const slug = typeof doc.slug === "string" ? doc.slug : undefined;
  revalidate(collectionPaths(collection.slug, slug, root));
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
    (collection === "pages" && (slug === "funding" || slug === "eligibility"))
  ) {
    paths.push("/how-to-apply/funding", "/how-to-apply/eligibility");
  }
  return paths.filter((path): path is string => Boolean(path));
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc;
  revalidate(["/about", "/contact", "/eligibility", "/funding", "/how-to-apply", "/privacy", "/terms"]);
  return doc;
};
