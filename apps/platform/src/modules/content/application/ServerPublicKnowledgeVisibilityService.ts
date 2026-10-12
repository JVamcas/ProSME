import "server-only";

import type { DatabaseTransaction } from "@/platform/database/client";
import { readPublicPageVisibilityInTransaction } from "../infrastructure/PublicPageVisibilityTransactionRepository";

// Background synchronization shares the visibility row lock with its existing
// publication transaction and does not depend on a Next request/cache context.
export function getPublicPageVisibilityInTransaction(
  transaction: DatabaseTransaction,
) {
  return readPublicPageVisibilityInTransaction(transaction);
}
