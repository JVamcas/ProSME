import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  notificationChannelCodeSchema,
  notificationTemplateImportFieldsSchema,
  notificationTemplateTargetIdSchema,
} from "@/modules/notifications/api/NotificationTemplateSchemas";
import {
  getNotificationTemplateTarget,
  importNotificationTemplate,
} from "@/modules/notifications/application/ServerNotificationTemplateService";

async function routeParameters(
  context: { params: Promise<{ channelCode: string; targetId: string }> },
) {
  const parameters = await context.params;
  return {
    channelCode: notificationChannelCodeSchema.parse(parameters.channelCode),
    targetId: notificationTemplateTargetIdSchema.parse(parameters.targetId),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ channelCode: string; targetId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { channelCode, targetId } = await routeParameters(context);
    return portalRouteSuccess(
      await getNotificationTemplateTarget(
        await resolveUserFromHeaders(request.headers),
        channelCode,
        targetId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ channelCode: string; targetId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { channelCode, targetId } = await routeParameters(context);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new RequestValidationError("A template HTML file is required.");
    }
    const fields = notificationTemplateImportFieldsSchema.parse({
      plainTextTemplate: formData.get("plainTextTemplate") || undefined,
      subjectTemplate: formData.get("subjectTemplate"),
    });
    return portalRouteSuccess(
      await importNotificationTemplate(
        await resolveUserFromHeaders(request.headers),
        channelCode,
        targetId,
        {
          bytes: new Uint8Array(await file.arrayBuffer()),
          fileName: file.name,
          mediaType: file.type,
          ...fields,
        },
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
