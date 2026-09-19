import type { FormCompleteness } from "@/modules/forms/engine/FormCompleteness";

function sectionStatus(
  completedRequiredFieldCount: number,
  requiredFieldCount: number,
) {
  if (requiredFieldCount === 0) return "Complete — no required fields";
  if (completedRequiredFieldCount === requiredFieldCount) return "Complete";
  const remaining = requiredFieldCount - completedRequiredFieldCount;
  return `${remaining} required ${remaining === 1 ? "field" : "fields"} remaining`;
}

export function FormCompletenessSummary({
  completeness,
}: {
  completeness: FormCompleteness;
}) {
  return (
    <aside
      aria-label="Form completeness"
      className="rounded-2xl border border-brand-navy/10 bg-brand-cream/35 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold text-brand-navy">Form completeness</h2>
        <p className="text-sm font-semibold text-brand-navy">
          {completeness.isComplete ? "Complete" : "Incomplete"}
        </p>
      </div>
      <p className="mt-1 text-sm text-brand-navy/70">
        {completeness.completedRequiredFieldCount} of{
          " "
        }{completeness.requiredFieldCount} required fields complete
      </p>
      <div
        aria-label="Required field completion"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={completeness.percentComplete}
        className="mt-3 h-2 overflow-hidden rounded-full bg-brand-white"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-brand-orange"
          style={{ width: `${completeness.percentComplete}%` }}
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {completeness.sections.map((section) => (
          <li
            className="flex items-start justify-between gap-3 text-sm"
            key={section.sectionId}
          >
            <span className="font-medium text-brand-navy">
              {section.sectionTitle}
            </span>
            <span className="text-right text-brand-navy/65">
              {sectionStatus(
                section.completedRequiredFieldCount,
                section.requiredFieldCount,
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
