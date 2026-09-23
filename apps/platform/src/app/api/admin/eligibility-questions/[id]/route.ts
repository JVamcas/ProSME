import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityQuestionUpdateSchema } from "@/modules/eligibility/api/EligibilityQuestionSchemas";
import { editEligibilityQuestion } from "@/modules/eligibility/application/ServerEligibilityQuestionService";

const paramsSchema = z.object({ id: z.uuid() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { id } = paramsSchema.parse(await context.params);
    const input = eligibilityQuestionUpdateSchema.parse(await request.json());
    return portalRouteSuccess(
      await editEligibilityQuestion(
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
