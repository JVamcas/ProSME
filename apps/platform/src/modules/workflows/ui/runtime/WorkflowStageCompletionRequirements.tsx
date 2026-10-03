import { CheckCircle2, Clock3, CircleAlert } from "lucide-react";

import type { WorkflowCompletionRequirement } from "../../api/WorkflowCompletionRequirementsTypes";
import type { WorkflowProgressStage } from "../../api/WorkflowProgressTypes";

const stateLabels = {
  MET: "Met",
  PENDING: "Pending",
  NOT_MET: "Not met",
  UNAVAILABLE: "Unable to evaluate",
};

function Requirement({
  requirement,
}: {
  requirement: WorkflowCompletionRequirement;
}) {
  const Icon =
    requirement.state === "MET"
      ? CheckCircle2
      : requirement.state === "PENDING"
        ? Clock3
        : CircleAlert;
  return (
    <li className="min-w-0 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 items-start gap-2 font-medium">
          <Icon
            aria-hidden="true"
            className={`mt-0.5 size-4 shrink-0 ${requirement.state === "MET" ? "text-brand-green" : "text-brand-orange"}`}
          />
          <span className="break-words">{requirement.label}</span>
        </span>
        <span className="text-xs font-medium">
          {stateLabels[requirement.state]}
        </span>
      </div>
      <p className="ml-6 mt-1 break-words text-xs text-brand-navy/65">
        {requirement.detail}
      </p>
      {requirement.children?.length ? (
        <ul className="ml-6 mt-2 border-l border-brand-navy/15 pl-3">
          {requirement.children.map((child) => (
            <Requirement key={child.id} requirement={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function WorkflowStageCompletionRequirements({
  stage,
}: {
  stage: WorkflowProgressStage;
}) {
  const completion = stage.completionRequirements;
  if (!completion) return null;
  const outstanding = completion.requirements.filter(
    (item) => item.state !== "MET",
  );
  const met = completion.requirements.filter((item) => item.state === "MET");
  return (
    <section
      aria-label="Completion requirements"
      className="mt-5 border-t border-brand-navy/10 pt-4 text-sm text-brand-navy"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Completion requirements</h4>
        <span className="text-xs">
          {outstanding.length
            ? `${outstanding.length} outstanding`
            : "All requirements met"}
        </span>
      </div>
      <p className="mt-1 text-xs text-brand-navy/65">
        {completion.satisfied
          ? "Completion requirements are satisfied. The stage remains open until the workflow records its completion."
          : "These requirements must be satisfied to complete this stage run. A pending decision is recorded when the reviewer acts."}
      </p>
      <ul className="mt-2 divide-y divide-brand-navy/10">
        {outstanding.map((item) => (
          <Requirement key={item.id} requirement={item} />
        ))}
      </ul>
      {met.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium">
            Satisfied requirements ({met.length})
          </summary>
          <ul className="mt-2 divide-y divide-brand-navy/10">
            {met.map((item) => (
              <Requirement key={item.id} requirement={item} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
