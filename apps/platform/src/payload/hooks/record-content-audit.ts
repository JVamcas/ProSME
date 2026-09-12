import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";

type AuditUser = { id?: number | string; email?: string } | null;

async function recordAudit(
  req: Parameters<CollectionAfterChangeHook>[0]["req"],
  collection: string,
  documentId: string,
  action: string,
) {
  const user = req.user as AuditUser;
  await req.payload.create({
    collection: "content-audit-entries",
    data: {
      action,
      actorEmail: user?.email ?? "system@smefund.na",
      actorId: String(user?.id ?? "system"),
      collection,
      documentId,
    },
    overrideAccess: true,
    req,
  });
}

export const recordCollectionChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const wasPublished = previousDoc?._status === "published";
  const isPublished = doc?._status === "published";
  const action = !wasPublished && isPublished
    ? "published"
    : wasPublished && !isPublished
      ? "unpublished"
      : operation;
  await recordAudit(req, collection.slug, String(doc.id), action);
  return doc;
};

export const recordCollectionDelete: CollectionAfterDeleteHook = async ({
  collection,
  doc,
  req,
}) => {
  await recordAudit(req, collection.slug, String(doc.id), "deleted");
  return doc;
};

export const recordGlobalChange: GlobalAfterChangeHook = async ({ global, doc, req }) => {
  await recordAudit(req, global.slug, global.slug, "updated");
  return doc;
};
