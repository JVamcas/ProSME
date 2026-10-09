import { useId } from "react";
import type { ReportRun } from "../../domain/Report";
import { reportParameterName } from "./ReportConfigurationPresentation";
import { reportRunParameterValue } from "./ReportRunPresentation";

export function ReportRunParameters({ run }: { run: ReportRun }) {
  const headingId = useId();
  const definitions = new Map(
    run.definition.parameters.map((parameter) => [parameter.name, parameter]),
  );
  const names = [
    ...new Set([
      ...run.definition.parameters
        .filter((parameter) => Object.hasOwn(run.values, parameter.name))
        .map((parameter) => parameter.name),
      ...Object.keys(run.values),
    ]),
  ];

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <h3 id={headingId} className="text-base font-semibold text-brand-navy">
        Resolved parameters
      </h3>
      {names.length ? (
        <dl className="divide-y divide-brand-navy/10 rounded-xl border border-brand-navy/10 px-4">
          {names.map((name) => {
            const definition = definitions.get(name);

            return (
              <div
                key={name}
                className="grid min-w-0 grid-cols-1 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-4"
              >
                <dt
                  className="break-words text-sm text-brand-navy/60"
                  title={name}
                >
                  {reportParameterName(name)}
                </dt>
                <dd className="whitespace-pre-wrap break-words text-sm font-medium text-brand-navy">
                  {reportRunParameterValue(run.values[name], definition)}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="text-sm text-brand-navy/60">
          This run has no parameters.
        </p>
      )}
    </section>
  );
}
