import type { WorkflowValidation } from "../../domain/definitions/WorkflowTypes";

type Props = {
  validation: WorkflowValidation;
};

export function WorkflowValidationAlert({ validation }: Props) {
  if (validation.valid) {
    return (
      <>
      </>
    );
  }

  return (
    <section
      aria-label="Workflow validation after stage deletion"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4"
      role="alert"
    >
      <p className="text-sm font-bold text-amber-900">
        Stage deleted. The draft workflow now needs attention.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900/80">
        {validation.errors.map((issue, index) => (
          <li key={`${issue.code}:${issue.path}:${index}`}>{issue.message}</li>
        ))}
      </ul>
    </section>
  );
}
