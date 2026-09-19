import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { formDefinitionDialogSchema } from "@/modules/forms/api/FormSchemas";
import {
  createNewForm,
  getForms,
} from "@/modules/forms/application/ServerFormsService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await getForms(await resolveUserFromHeaders(request.headers)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = formDefinitionDialogSchema.parse(await request.json());
    return portalRouteSuccess(
      await createNewForm(
        await resolveUserFromHeaders(request.headers),
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
