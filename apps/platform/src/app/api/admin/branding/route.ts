import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  getBrandingSettings,
  updateBrandingLogo,
} from "@/modules/branding/application/ServerBrandingService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await getBrandingSettings(user),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PUT(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const [user, form] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      request.formData(),
    ]);
    const logo = form.get("logo");
    if (!(logo instanceof File)) {
      throw new RequestValidationError("Choose a logo file to upload.");
    }
    return portalRouteSuccess(
      await updateBrandingLogo(user, logo),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
