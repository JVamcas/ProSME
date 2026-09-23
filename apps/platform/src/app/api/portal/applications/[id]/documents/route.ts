import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  getOwnApplicationDocuments,
  uploadOwnApplicationDocument,
} from "@/modules/applications/application/ServerApplicationDocumentService";

type DocumentsRouteContext = { params: Promise<{ id: string }> };
const applicationIdSchema = z.uuid();

async function routeContext(request: Request, route: DocumentsRouteContext) {
  const [user, params] = await Promise.all([
    resolveUserFromHeaders(request.headers),
    route.params,
  ]);
  return { id: applicationIdSchema.parse(params.id), user };
}

export async function GET(request: Request, route: DocumentsRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const context = await routeContext(request, route);
    const documents = await getOwnApplicationDocuments(
      context.user,
      context.id,
    );
    return portalRouteSuccess(documents, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request, route: DocumentsRouteContext) {
  const correlationId = createCorrelationId();
  try {
    const context = await routeContext(request, route);
    const form = await request.formData();
    const requirementKey = form.get("requirementKey");
    const file = form.get("file");
    if (typeof requirementKey !== "string" || !(file instanceof File)) {
      throw new RequestValidationError(
        "Select a document type and file to upload.",
      );
    }
    const documents = await uploadOwnApplicationDocument(
      context.user,
      context.id,
      requirementKey,
      file,
    );
    return portalRouteSuccess(documents, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
