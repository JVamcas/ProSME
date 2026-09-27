import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  notificationChannelCodeSchema,
  notificationTemplateTargetIdSchema,
  notificationTemplateVersionIdSchema,
} from "@/modules/notifications/api/NotificationTemplateSchemas";
import { publishNotificationTemplate } from "@/modules/notifications/application/ServerNotificationTemplateService";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      channelCode: string;
      targetId: string;
      versionId: string;
    }>;
  },
) {
  const correlationId = createCorrelationId();
  try {
    const parameters = await context.params;
    return portalRouteSuccess(
      await publishNotificationTemplate(
        await resolveUserFromHeaders(request.headers),
        notificationChannelCodeSchema.parse(parameters.channelCode),
        notificationTemplateTargetIdSchema.parse(parameters.targetId),
        notificationTemplateVersionIdSchema.parse(parameters.versionId),
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
