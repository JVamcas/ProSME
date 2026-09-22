import type { EligibilityBuilderFieldPresentation } from "./EligibilityBuilderFieldPresentation";

export function EligibilityFieldCatalogue({
  fields,
}: {
  fields: readonly EligibilityBuilderFieldPresentation[];
}) {
  return (
    <section
      aria-labelledby="eligibility-field-catalogue-heading"
      className="rounded-xl border border-brand-navy/15 bg-brand-cream/30 p-3"
    >
      <h4
        className="text-sm font-semibold text-brand-navy"
        id="eligibility-field-catalogue-heading"
      >
        Available fields
      </h4>
      {fields.length ? (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <li
              className="rounded-lg border border-brand-navy/10 bg-white px-3 py-2"
              key={field.key}
            >
              <p className="text-sm font-semibold text-brand-navy">
                {field.label}
              </p>
              <p className="mt-1 text-xs text-brand-navy/70">
                {field.type} · {field.modeLabel} · {field.sourceLabel}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-amber-800" role="status">
          No fields are available in every selected execution mode.
        </p>
      )}
    </section>
  );
}
