import { and, sql, type SQL } from "drizzle-orm";

import type { AdminApplicationListInput } from "../ApplicationTypes";

const submittedDate = sql`(application.submitted_at AT TIME ZONE 'Africa/Windhoek')::date`;
const dateOfBirth = sql`CASE WHEN snapshot.id IS NOT NULL
  THEN NULLIF(snapshot.snapshot_content->'applicant'->>'dateOfBirth', '')::date
  ELSE profile.date_of_birth END`;
const ageAtSubmission = sql`EXTRACT(YEAR FROM age(${submittedDate}, ${dateOfBirth}))`;
const businessRegion = sql`CASE WHEN snapshot.id IS NOT NULL
  THEN snapshot.business_data->>'region' ELSE business.region END`;
const businessSector = sql`CASE WHEN snapshot.id IS NOT NULL
  THEN snapshot.business_data->>'sector' ELSE business.sector END`;

export function applicationSelectionFilter(
  column: SQL,
  input?: string | string[],
  ignoreCase = false,
) {
  const values = (Array.isArray(input) ? input : input ? [input] : []).filter(
    Boolean,
  );
  if (!values.length) return sql`TRUE`;
  const parameters = values.map(
    (value) => sql`${ignoreCase ? value.toLowerCase() : value}`,
  );
  const expression = ignoreCase ? sql`lower(${column})` : column;
  return sql`${expression} IN (${sql.join(parameters, sql`, `)})`;
}

export function adminApplicationDemographicFilters(
  input: AdminApplicationListInput,
) {
  return (
    and(
      input.ageMin === undefined
        ? undefined
        : sql`${ageAtSubmission} >= ${input.ageMin}`,
      input.ageMax === undefined
        ? undefined
        : sql`${ageAtSubmission} <= ${input.ageMax}`,
      applicationSelectionFilter(
        sql`COALESCE(NULLIF(snapshot.snapshot_content->'applicant'->>'gender', ''), profile.gender)`,
        input.gender,
      ),
      applicationSelectionFilter(businessRegion, input.region, true),
      applicationSelectionFilter(businessSector, input.sector, true),
      input.submittedAfter
        ? sql`application.submitted_at >= ${input.submittedAfter}::timestamptz`
        : undefined,
      input.submittedBefore
        ? sql`application.submitted_at <= ${input.submittedBefore}::timestamptz`
        : undefined,
      input.submittedFrom
        ? sql`application.submitted_at >= (${input.submittedFrom}::date::timestamp AT TIME ZONE 'Africa/Windhoek')`
        : undefined,
      input.submittedTo
        ? sql`application.submitted_at < ((${input.submittedTo}::date + 1)::timestamp AT TIME ZONE 'Africa/Windhoek')`
        : undefined,
    ) ?? sql`TRUE`
  );
}
