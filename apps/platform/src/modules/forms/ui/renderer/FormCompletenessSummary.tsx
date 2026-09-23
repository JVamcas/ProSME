import type { FormCompleteness } from "@/modules/forms/engine/FormCompleteness";

export type SupplementalCompletion = {
  completedCount: number;
  id: string;
  requiredCount: number;
  title: string;
  unit: "document" | "field";
};

function sectionStatus(
  completedRequiredFieldCount: number,
  requiredFieldCount: number,
  unit: "document" | "field" = "field",
) {
  if (requiredFieldCount === 0) return `Complete — no required ${unit}s`;
  if (completedRequiredFieldCount === requiredFieldCount) return "Complete";
  const remaining = requiredFieldCount - completedRequiredFieldCount;
  return `${remaining} required ${unit}${remaining === 1 ? "" : "s"} remaining`;
}

export function FormCompletenessSummary({
  completeness,
  supplementalCompletion,
}: {
  completeness: FormCompleteness;
  supplementalCompletion?: SupplementalCompletion;
}) {
  const requiredCount = completeness.requiredFieldCount
    + (supplementalCompletion?.requiredCount ?? 0);
  const completedCount = completeness.completedRequiredFieldCount
    + (supplementalCompletion?.completedCount ?? 0);
  const percentComplete = requiredCount === 0
    ? 100
    : Math.round(completedCount / requiredCount * 100);
  const sections: SupplementalCompletion[] = completeness.sections.map((section) => ({
    completedCount: section.completedRequiredFieldCount,
    id: section.sectionId,
    requiredCount: section.requiredFieldCount,
    title: section.sectionTitle,
    unit: "field" as const,
  }));
  if (supplementalCompletion) {
    sections.splice(Math.max(0, sections.length - 1), 0, supplementalCompletion);
  }

  return (
    <aside
      aria-label="Form completeness"
      className="rounded-2xl border border-brand-navy/10 bg-brand-cream/35 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold text-brand-navy">Form completeness</h2>
        <p className="text-sm font-semibold text-brand-navy">
          {completedCount === requiredCount ? "Complete" : "Incomplete"}
        </p>
      </div>
      <p className="mt-1 text-sm text-brand-navy/70">
        {completedCount} of {requiredCount} required{
          supplementalCompletion ? " fields and documents" : " fields"
        } complete
      </p>
      <div
        aria-label={
          supplementalCompletion
            ? "Required field and document completion"
            : "Required field completion"
        }
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentComplete}
        className="mt-3 h-2 overflow-hidden rounded-full bg-brand-white"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-brand-orange"
          style={{ width: `${percentComplete}%` }}
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {sections.map((section) => (
          <li
            className="flex items-start justify-between gap-3 text-sm"
            key={section.id}
          >
            <span className="font-medium text-brand-navy">
              {section.title}
            </span>
            <span className="text-right text-brand-navy/65">
              {sectionStatus(
                section.completedCount,
                section.requiredCount,
                section.unit,
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
