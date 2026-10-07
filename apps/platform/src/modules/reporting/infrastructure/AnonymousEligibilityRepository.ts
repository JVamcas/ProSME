import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type { SelfCheckOutcome } from "../domain/WebsiteAnalyticsCollection";

export async function recordAnonymousEligibilityCheck(input: {
  fundingCallId: string;
  ruleSetVersionId: string;
  outcome: SelfCheckOutcome;
}) {
  // Project only a confirmed advisory category. Never persist answers or actors.
  await getDatabase().execute(sql`
    INSERT INTO app_reporting_anonymous_eligibility_checks
      (funding_call_id, funding_call_version, rule_set_version_id, outcome)
    SELECT id, row_version, ${input.ruleSetVersionId}::uuid, ${input.outcome}
    FROM app_funding_calls
    WHERE id = ${input.fundingCallId}::uuid
      AND eligibility_rule_set_version_id = ${input.ruleSetVersionId}::uuid
  `);
}

export function anonymousEligibilityAggregationSql(input: {
  startDate: string;
  endDate: string;
  timezone: string;
  fundingCallId?: string;
}) {
  const scope = input.fundingCallId
    ? sql`AND funding_call_id = ${input.fundingCallId}::uuid`
    : sql``;
  return sql`
    SELECT outcome, count(*)::integer AS checks
    FROM app_reporting_anonymous_eligibility_checks
    WHERE occurred_at >= (${input.startDate}::date::timestamp AT TIME ZONE ${input.timezone})
      AND occurred_at < ((${input.endDate}::date + 1)::timestamp AT TIME ZONE ${input.timezone})
      ${scope}
    GROUP BY outcome ORDER BY outcome
  `;
}

export async function aggregateAnonymousEligibilityChecks(
  input: Parameters<typeof anonymousEligibilityAggregationSql>[0],
) {
  const result = await getDatabase().execute<{
    outcome: SelfCheckOutcome;
    checks: number;
  }>(anonymousEligibilityAggregationSql(input));
  return result.rows;
}
