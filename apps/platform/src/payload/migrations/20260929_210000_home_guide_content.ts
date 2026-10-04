import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms_homepage"
      ADD COLUMN "funding_button_label" varchar DEFAULT 'Funding Opportunities',
      ADD COLUMN "benefit_funding" varchar DEFAULT 'Access funding',
      ADD COLUMN "benefit_capacity" varchar DEFAULT 'Build your capacity',
      ADD COLUMN "benefit_opportunity" varchar DEFAULT 'Create opportunities',
      ADD COLUMN "action_cards_funding_title" varchar DEFAULT 'I want funding',
      ADD COLUMN "action_cards_funding_description" varchar DEFAULT 'Explore current opportunities and find the right funding for your business.',
      ADD COLUMN "action_cards_eligibility_title" varchar DEFAULT 'Am I eligible?',
      ADD COLUMN "action_cards_eligibility_description" varchar DEFAULT 'Check if your business meets the key criteria before you apply.',
      ADD COLUMN "action_cards_tracking_title" varchar DEFAULT 'I already applied',
      ADD COLUMN "action_cards_tracking_description" varchar DEFAULT 'Track your application and stay updated on the next steps.',
      ADD COLUMN "process_heading" varchar DEFAULT 'How it works',
      ADD COLUMN "process_introduction" varchar DEFAULT 'A simple, transparent process to get you from application to support.',
      ADD COLUMN "support_heading" varchar DEFAULT 'Who we support',
      ADD COLUMN "support_introduction" varchar DEFAULT 'The SME Fund is open to any Namibian MSME with high potential, inclusive impact and a commitment to growth. Our priority areas include:',
      ADD COLUMN "news_introduction" varchar DEFAULT 'Updates, stories and useful materials for Namibian entrepreneurs.',
      ADD COLUMN "funding_slogan" varchar DEFAULT 'Brighter businesses. A stronger Namibia.';

    ALTER TABLE "_cms_homepage_v"
      ADD COLUMN "version_funding_button_label" varchar DEFAULT 'Funding Opportunities',
      ADD COLUMN "version_benefit_funding" varchar DEFAULT 'Access funding',
      ADD COLUMN "version_benefit_capacity" varchar DEFAULT 'Build your capacity',
      ADD COLUMN "version_benefit_opportunity" varchar DEFAULT 'Create opportunities',
      ADD COLUMN "version_action_cards_funding_title" varchar DEFAULT 'I want funding',
      ADD COLUMN "version_action_cards_funding_description" varchar DEFAULT 'Explore current opportunities and find the right funding for your business.',
      ADD COLUMN "version_action_cards_eligibility_title" varchar DEFAULT 'Am I eligible?',
      ADD COLUMN "version_action_cards_eligibility_description" varchar DEFAULT 'Check if your business meets the key criteria before you apply.',
      ADD COLUMN "version_action_cards_tracking_title" varchar DEFAULT 'I already applied',
      ADD COLUMN "version_action_cards_tracking_description" varchar DEFAULT 'Track your application and stay updated on the next steps.',
      ADD COLUMN "version_process_heading" varchar DEFAULT 'How it works',
      ADD COLUMN "version_process_introduction" varchar DEFAULT 'A simple, transparent process to get you from application to support.',
      ADD COLUMN "version_support_heading" varchar DEFAULT 'Who we support',
      ADD COLUMN "version_support_introduction" varchar DEFAULT 'The SME Fund is open to any Namibian MSME with high potential, inclusive impact and a commitment to growth. Our priority areas include:',
      ADD COLUMN "version_news_introduction" varchar DEFAULT 'Updates, stories and useful materials for Namibian entrepreneurs.',
      ADD COLUMN "version_funding_slogan" varchar DEFAULT 'Brighter businesses. A stronger Namibia.';

    ALTER TABLE "cms_homepage_blocks_statistics"
      ADD COLUMN "campaign_message" varchar DEFAULT 'Small Businesses. A Brighter Namibia';
    ALTER TABLE "_cms_homepage_v_blocks_statistics"
      ADD COLUMN "campaign_message" varchar DEFAULT 'Small Businesses. A Brighter Namibia';
    ALTER TABLE "cms_pages_blocks_statistics"
      ADD COLUMN "campaign_message" varchar DEFAULT 'Small Businesses. A Brighter Namibia';
    ALTER TABLE "_cms_pages_v_blocks_statistics"
      ADD COLUMN "campaign_message" varchar DEFAULT 'Small Businesses. A Brighter Namibia';

    CREATE TABLE "cms_homepage_process_steps" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "cms_homepage"("id") ON DELETE cascade,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar,
      "description" varchar
    );
    CREATE INDEX "cms_homepage_process_steps_order_idx" ON "cms_homepage_process_steps" ("_order");
    CREATE INDEX "cms_homepage_process_steps_parent_id_idx" ON "cms_homepage_process_steps" ("_parent_id");

    CREATE TABLE "_cms_homepage_v_version_process_steps" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "_cms_homepage_v"("id") ON DELETE cascade,
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar,
      "description" varchar,
      "_uuid" varchar
    );
    CREATE INDEX "_cms_homepage_v_version_process_steps_order_idx" ON "_cms_homepage_v_version_process_steps" ("_order");
    CREATE INDEX "_cms_homepage_v_version_process_steps_parent_id_idx" ON "_cms_homepage_v_version_process_steps" ("_parent_id");

    INSERT INTO "cms_homepage_process_steps" ("_order", "_parent_id", "id", "title", "description")
    SELECT steps.number, home.id, md5(home.id::text || steps.number::text), steps.title, steps.description
    FROM "cms_homepage" home
    CROSS JOIN (VALUES
      (1, 'Check eligibility', 'See if your business meets the key criteria.'),
      (2, 'Prepare your business', 'Get your documents ready and strengthen your application.'),
      (3, 'Apply online', 'Submit your application through our secure portal.'),
      (4, 'Track your application', 'Stay updated on your progress every step of the way.')
    ) AS steps(number, title, description);

    INSERT INTO "_cms_homepage_v_version_process_steps" ("_order", "_parent_id", "title", "description", "_uuid")
    SELECT steps.number, version.id, steps.title, steps.description, md5(version.id::text || steps.number::text)
    FROM "_cms_homepage_v" version
    CROSS JOIN (VALUES
      (1, 'Check eligibility', 'See if your business meets the key criteria.'),
      (2, 'Prepare your business', 'Get your documents ready and strengthen your application.'),
      (3, 'Apply online', 'Submit your application through our secure portal.'),
      (4, 'Track your application', 'Stay updated on your progress every step of the way.')
    ) AS steps(number, title, description);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_cms_pages_v_blocks_statistics" DROP COLUMN "campaign_message";
    ALTER TABLE "cms_pages_blocks_statistics" DROP COLUMN "campaign_message";
    ALTER TABLE "_cms_homepage_v_blocks_statistics" DROP COLUMN "campaign_message";
    ALTER TABLE "cms_homepage_blocks_statistics" DROP COLUMN "campaign_message";
    DROP TABLE "_cms_homepage_v_version_process_steps";
    DROP TABLE "cms_homepage_process_steps";
    ALTER TABLE "_cms_homepage_v"
      DROP COLUMN "version_funding_button_label", DROP COLUMN "version_benefit_funding",
      DROP COLUMN "version_benefit_capacity", DROP COLUMN "version_benefit_opportunity",
      DROP COLUMN "version_action_cards_funding_title", DROP COLUMN "version_action_cards_funding_description",
      DROP COLUMN "version_action_cards_eligibility_title", DROP COLUMN "version_action_cards_eligibility_description",
      DROP COLUMN "version_action_cards_tracking_title", DROP COLUMN "version_action_cards_tracking_description",
      DROP COLUMN "version_process_heading", DROP COLUMN "version_process_introduction",
      DROP COLUMN "version_support_heading", DROP COLUMN "version_support_introduction",
      DROP COLUMN "version_news_introduction", DROP COLUMN "version_funding_slogan";
    ALTER TABLE "cms_homepage"
      DROP COLUMN "funding_button_label", DROP COLUMN "benefit_funding",
      DROP COLUMN "benefit_capacity", DROP COLUMN "benefit_opportunity",
      DROP COLUMN "action_cards_funding_title", DROP COLUMN "action_cards_funding_description",
      DROP COLUMN "action_cards_eligibility_title", DROP COLUMN "action_cards_eligibility_description",
      DROP COLUMN "action_cards_tracking_title", DROP COLUMN "action_cards_tracking_description",
      DROP COLUMN "process_heading", DROP COLUMN "process_introduction",
      DROP COLUMN "support_heading", DROP COLUMN "support_introduction",
      DROP COLUMN "news_introduction", DROP COLUMN "funding_slogan";
  `);
}
