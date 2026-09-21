UPDATE "app_funding_calls"
SET "id" = (
  substring(replace("id"::text, '-', '') from 1 for 12)
  || '4'
  || substring(replace("id"::text, '-', '') from 14 for 3)
  || '8'
  || substring(replace("id"::text, '-', '') from 18 for 15)
)::uuid
WHERE substring(replace("id"::text, '-', '') from 13 for 1)
        NOT IN ('1', '2', '3', '4', '5', '6', '7', '8')
   OR substring(replace("id"::text, '-', '') from 17 for 1)
        NOT IN ('8', '9', 'a', 'b');
--> statement-breakpoint
UPDATE "app_applications"
SET "funding_opportunity_id" = (
  substring(replace("funding_opportunity_id"::text, '-', '') from 1 for 12)
  || '4'
  || substring(replace("funding_opportunity_id"::text, '-', '') from 14 for 3)
  || '8'
  || substring(replace("funding_opportunity_id"::text, '-', '') from 18 for 15)
)::uuid
WHERE substring(replace("funding_opportunity_id"::text, '-', '') from 13 for 1)
        NOT IN ('1', '2', '3', '4', '5', '6', '7', '8')
   OR substring(replace("funding_opportunity_id"::text, '-', '') from 17 for 1)
        NOT IN ('8', '9', 'a', 'b');
--> statement-breakpoint
UPDATE "app_eligibility_assessments"
SET "funding_opportunity_id" = (
  substring(replace("funding_opportunity_id"::text, '-', '') from 1 for 12)
  || '4'
  || substring(replace("funding_opportunity_id"::text, '-', '') from 14 for 3)
  || '8'
  || substring(replace("funding_opportunity_id"::text, '-', '') from 18 for 15)
)::uuid
WHERE substring(replace("funding_opportunity_id"::text, '-', '') from 13 for 1)
        NOT IN ('1', '2', '3', '4', '5', '6', '7', '8')
   OR substring(replace("funding_opportunity_id"::text, '-', '') from 17 for 1)
        NOT IN ('8', '9', 'a', 'b');
--> statement-breakpoint
UPDATE "app_funding_opportunity_workflows"
SET "funding_opportunity_id" = (
  substring(replace("funding_opportunity_id"::text, '-', '') from 1 for 12)
  || '4'
  || substring(replace("funding_opportunity_id"::text, '-', '') from 14 for 3)
  || '8'
  || substring(replace("funding_opportunity_id"::text, '-', '') from 18 for 15)
)::uuid
WHERE substring(replace("funding_opportunity_id"::text, '-', '') from 13 for 1)
        NOT IN ('1', '2', '3', '4', '5', '6', '7', '8')
   OR substring(replace("funding_opportunity_id"::text, '-', '') from 17 for 1)
        NOT IN ('8', '9', 'a', 'b');
