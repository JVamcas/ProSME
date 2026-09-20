import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  formDefinitionDialogSchema,
  formListSchema,
} from "@/modules/forms/api/FormSchemas";
import {
  createNewForm,
  getForms,
} from "@/modules/forms/application/ServerFormsService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = formListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await getForms(
      await resolveUserFromHeaders(request.headers),
      input,
    );
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: page.page < page.totalPages ? String(page.page + 1) : null,
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    });
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
