import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { WorkflowCoiReviewListInput } from "../../api/WorkflowCoiReviewTypes";
import {
  readPendingWorkflowCoiReview,
  readPendingWorkflowCoiReviews,
} from "../../infrastructure/WorkflowCoiReviewRepository";

export async function getPendingWorkflowCoiReviews(
  user: AuthenticatedUser | null,
  input: WorkflowCoiReviewListInput,
) {
  const actor = requirePermission(user, permissionCodes.workflowCoiAllReview);
  const projection = await readPendingWorkflowCoiReviews(actor.id, input);
  return {
    ...projection,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function getPendingWorkflowCoiReview(
  user: AuthenticatedUser | null,
  taskId: string,
) {
  const actor = requirePermission(user, permissionCodes.workflowCoiAllReview);
  const review = await readPendingWorkflowCoiReview(actor.id, taskId);
  if (!review) throw new ResourceNotFoundError("pending COI disclosure");
  return review;
}
