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
  revalidate([root, root && slug ? `${root}/${slug}` : undefined, collection.slug === "pages" && slug ? `/${slug}` : undefined].filter((path): path is string => Boolean(path)));
  return doc;
};

export const revalidateCollectionDelete: CollectionAfterDeleteHook = ({ collection, doc, req }) => {
  if (req.context?.skipRevalidation) return doc;
  const root = roots[collection.slug];
  const slug = typeof doc.slug === "string" ? doc.slug : undefined;
  revalidate([root, root && slug ? `${root}/${slug}` : undefined, collection.slug === "pages" && slug ? `/${slug}` : undefined].filter((path): path is string => Boolean(path)));
  return doc;
};

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc;
  revalidate(["/about", "/contact", "/eligibility", "/funding", "/how-to-apply", "/privacy", "/terms"]);
  return doc;
};
