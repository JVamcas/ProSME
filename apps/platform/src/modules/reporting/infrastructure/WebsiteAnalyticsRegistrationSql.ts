import "server-only";
import { sql } from "drizzle-orm";
import type { WebsiteAnalyticsQueryIdentity } from "./WebsiteAnalyticsQueryIdentity";

export function websiteAnalyticsRegistrationSql(
  identities: WebsiteAnalyticsQueryIdentity[],
) {
  return sql`
    INSERT INTO app_reporting_website_queries AS existing
      (query_key, property_id, timezone, collection_start, contract_version,
       start_date, end_date, funding_call_id, include_panels)
    SELECT "queryKey", "propertyId", timezone, "collectionStart", "contractVersion",
      "startDate", "endDate", "fundingCallId", "includePanels"
    FROM jsonb_to_recordset(${JSON.stringify(identities)}::jsonb) AS requested(
      "queryKey" text, "propertyId" text, timezone text, "collectionStart" date,
      "contractVersion" text, "startDate" date, "endDate" date,
      "fundingCallId" uuid, "includePanels" boolean)
    ON CONFLICT (query_key) DO UPDATE SET
      last_requested_at = CURRENT_TIMESTAMP,
      include_panels = existing.include_panels OR EXCLUDED.include_panels,
      next_due_at = CASE WHEN EXCLUDED.include_panels AND NOT existing.include_panels
        THEN CURRENT_TIMESTAMP ELSE existing.next_due_at END
    RETURNING query_key, start_date, include_panels, failures,
      lease_expires_at, last_attempt_at
  `;
}
