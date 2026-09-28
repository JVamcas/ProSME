import "server-only";

import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  getLatestPublishedFormRuntimeByCode,
  getPublishedFormRuntime,
} from "@/modules/forms/infrastructure/FormRepository";

export async function getPublishedSystemFormRuntime(code: string) {
  const runtime = await getLatestPublishedFormRuntimeByCode(code);
  if (!runtime) throw new ResourceNotFoundError("published system form");
  return runtime;
}

export async function getPublishedSystemFormRuntimeVersion(versionId: string) {
  const runtime = await getPublishedFormRuntime(versionId);
  if (!runtime) throw new ResourceNotFoundError("published system form version");
  return runtime;
}
