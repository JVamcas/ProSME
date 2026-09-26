import "server-only";

import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getLatestPublishedFormRuntimeByCode } from "@/modules/forms/infrastructure/FormRepository";

export async function getPublishedSystemFormRuntime(code: string) {
  const runtime = await getLatestPublishedFormRuntimeByCode(code);
  if (!runtime) throw new ResourceNotFoundError("published system form");
  return runtime;
}
