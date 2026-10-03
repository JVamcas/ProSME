"use client";

import { GeneralButton } from "@/components/ui/button";
import { useTaskWorkflowRfis } from "./WorkflowRfiHooks";
import { WorkflowRfiTaskStatus } from "./WorkflowRfiTaskStatus";

export function WorkflowTaskRfiNotice({
  taskId,
  onViewRequests,
}: {
  taskId: string;
  onViewRequests: () => void;
}) {
  const requests = useTaskWorkflowRfis(taskId);
  if (requests.isPending) return null;
  if (requests.isError) {
    return (
      <p role="alert">
        Information request status could not be loaded: {requests.error.message}
      </p>
    );
  }
  const request =
    requests.data.find((item) => item.status === "OPEN") ??
    requests.data.find((item) => item.status === "RESPONDED") ??
    requests.data[0];
  if (!request) return null;

  return (
    <section
      aria-label="Information request status"
      className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-orange/25 bg-brand-cream p-4"
    >
      <WorkflowRfiTaskStatus request={request} />
      <GeneralButton onClick={onViewRequests} variant="outline" size="compact">
        View information requests
      </GeneralButton>
    </section>
  );
}
