import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { formEditorSchema } from "@/modules/forms/FormSchemas";
import { getForm, updateFormDraft } from "@/modules/forms/ServerFormsService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { id } = await context.params;
    return portalRouteSuccess(
      await getForm(await resolveUserFromHeaders(request.headers), id),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const input = formEditorSchema.parse(await request.json());
    const { id } = await context.params;
    return portalRouteSuccess(
      await updateFormDraft(
        await resolveUserFromHeaders(request.headers),
        id,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
