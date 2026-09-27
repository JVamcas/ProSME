import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getOwnedWorkflowRfi } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";
import { ApplicantWorkflowRfiWorkspace } from "@/modules/workflows/ui/rfi/ApplicantWorkflowRfiWorkspace";

export const metadata: Metadata = { title: "Request for information" };

const parametersSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
});

export default async function WorkflowRfiPage({
  params,
}: {
  params: Promise<{ id: string; requestId: string }>;
}) {
  const [user, parameters] = await Promise.all([
    getCurrentUser(),
    params.then((value) => parametersSchema.safeParse(value)),
  ]);
  if (!parameters.success) notFound();
  const detail = await getOwnedWorkflowRfi(
    user,
    parameters.data.id,
    parameters.data.requestId,
  ).catch((error: unknown) => {
    if (error instanceof ResourceNotFoundError) notFound();
    throw error;
  });
  return <ApplicantWorkflowRfiWorkspace initialDetail={detail} />;
}
