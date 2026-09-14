import Link from "next/link";

import type { FundingOpportunitySummary } from "@/modules/funding-opportunities/FundingOpportunityTypes";
import type {
  PublishedWorkflowOption,
  WorkflowDefinitionSummary,
  WorkflowOpportunityAssignment,
} from "@/modules/workflows/WorkflowTypes";

export function WorkflowAssignedFundingLinks({
  assignments,
  opportunities,
  publishedWorkflows,
  workflow,
}: {
  assignments: WorkflowOpportunityAssignment[];
  opportunities: FundingOpportunitySummary[];
  publishedWorkflows: PublishedWorkflowOption[];
  workflow: WorkflowDefinitionSummary;
}) {
  const versionIds = new Set(
    publishedWorkflows
      .filter((item) => item.definitionId === workflow.id)
      .map((item) => item.versionId),
  );
  const assigned = assignments.filter((item) =>
    versionIds.has(item.workflowVersionId));
  if (!assigned.length) return <span className="text-brand-navy/45">—</span>;
  return (
    <div className="grid gap-1">
      {assigned.map((item) => {
        const opportunity = opportunities.find(
          (candidate) => candidate.id === item.fundingOpportunityId,
        );
        return (
          <Link
            className="font-semibold text-brand-orange hover:underline"
            href={opportunity ? `/funding/${opportunity.slug}` : "/funding"}
            key={item.fundingOpportunityId}
          >
            {item.fundingOpportunityTitle}
          </Link>
        );
      })}
    </div>
  );
}
