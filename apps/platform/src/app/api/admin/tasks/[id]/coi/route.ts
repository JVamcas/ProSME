import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  declareWorkflowTaskCoi,
  getWorkflowTaskCoi,
  reviewWorkflowTaskCoi,
} from "@/modules/workflows/application/runtime/ServerWorkflowCoiService";

const declarationSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("NO_CONFLICT"),
    expectedRowVersion: z.number().int().positive(),
  }).strict(),
  z.object({
    decision: z.literal("DISCLOSE"),
    disclosureText: z.string().trim().min(1).max(4000),
    expectedRowVersion: z.number().int().positive(),
  }).strict(),
]);

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.enum(["CLEAR", "REVOKE"]),
    expectedRowVersion: z.number().int().positive(),
    reason: z.string().trim().min(10).max(1000),
  }).strict(),
  z.object({
    decision: z.literal("RECUSE"),
    expectedRowVersion: z.number().int().positive(),
    reason: z.string().trim().min(10).max(1000),
    replacementUserId: z.uuid(),
  }).strict(),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    return portalRouteSuccess(
      await getWorkflowTaskCoi(user, z.uuid().parse(params.id)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json().catch(() => undefined),
    ]);
    return portalRouteSuccess(
      await declareWorkflowTaskCoi(user, {
        ...declarationSchema.parse(body),
        taskId: z.uuid().parse(params.id),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json().catch(() => undefined),
    ]);
    return portalRouteSuccess(
      await reviewWorkflowTaskCoi(user, {
        ...reviewSchema.parse(body),
        taskId: z.uuid().parse(params.id),
        correlationId,
        idempotencyKey: z.uuid().parse(request.headers.get("Idempotency-Key")),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

