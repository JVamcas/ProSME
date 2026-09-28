import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
import type { WorkflowRfiSummary } from "../../domain/runtime/WorkflowRfiView";

export function WorkflowRfiSummaryContent({
  className,
  request,
}: {
  className?: string;
  request: Pick<WorkflowRfiSummary, "instructions" | "question">;
}) {
  if (!request.instructions) {
    return <p className={className}>{request.question}</p>;
  }

  return (
    <SanitizedRichTextContent
      className={className}
      sanitizedHtml={request.instructions}
    />
  );
}
