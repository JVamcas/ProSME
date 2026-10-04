import type { WorkflowTransitionDefinition } from "../../domain/transitions/WorkflowTransitionDefinition";
import { terminalOutcomeApplicantStatus } from "../../domain/transitions/WorkflowTerminalOutcome";

export function WorkflowTerminalApplicantStatus({
  route,
}: {
  route: WorkflowTransitionDefinition;
}) {
  if (!route.terminalOutcome) return null;
  const mapping = terminalOutcomeApplicantStatus(
    route.terminalOutcome,
    route.terminalApplicantStatus,
  );
  return (
    <dl className="mt-3 space-y-2 text-sm">
      <div>
        <dt className="text-xs text-brand-navy/60">Applicant status label</dt>
        <dd className="font-medium text-brand-navy">{mapping.label}</dd>
      </div>
      <div>
        <dt className="text-xs text-brand-navy/60">
          Applicant status description
        </dt>
        <dd className="text-brand-navy/80">{mapping.description}</dd>
      </div>
    </dl>
  );
}
