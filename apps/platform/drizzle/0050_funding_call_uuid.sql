ALTER TABLE "app_funding_calls"
  ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
--> statement-breakpoint
ALTER TABLE "app_funding_calls"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE uuid
    USING md5('funding-opportunity:' || "id"::text)::uuid,
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "app_applications"
  ALTER COLUMN "funding_opportunity_id" TYPE uuid
    USING md5('funding-opportunity:' || "funding_opportunity_id"::text)::uuid;
--> statement-breakpoint
ALTER TABLE "app_eligibility_assessments"
  ALTER COLUMN "funding_opportunity_id" TYPE uuid
    USING md5('funding-opportunity:' || "funding_opportunity_id"::text)::uuid;
--> statement-breakpoint
ALTER TABLE "app_funding_opportunity_workflows"
  ALTER COLUMN "funding_opportunity_id" TYPE uuid
    USING md5('funding-opportunity:' || "funding_opportunity_id"::text)::uuid;
