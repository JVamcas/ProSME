import "server-only";

import { readFormReadinessProjection as readProjection } from "../infrastructure/FormReadinessRepository";

export async function readFormReadinessProjection(versionId: string) {
  return readProjection(versionId);
}
