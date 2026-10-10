import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { vi } from "vitest";
import { getDatabase } from "@/platform/database/client";
import {
  chatbotActor,
  chatbotCall,
  chatbotEligibility,
  chatbotFaq,
  chatbotId,
} from "./ChatbotKnowledgeFixture";

export async function installChatbotKnowledgeDatabaseFixture(
  connectionString: string,
) {
  const schema = `chatbot_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const pool = new Pool({
    connectionString,
    max: 5,
    options: `-c search_path=${schema}`,
  });
  await pool.query(`CREATE SCHEMA ${schema}`);
  await pool.query(`
    CREATE TABLE app_users(id uuid PRIMARY KEY);
    CREATE TABLE app_capabilities(code text PRIMARY KEY, description text NOT NULL);
    CREATE TABLE app_funding_calls(id uuid PRIMARY KEY, status text, current_published_version_id uuid, eligibility_rule_set_version_id uuid);
    CREATE TABLE app_funding_call_publication_revisions(id uuid PRIMARY KEY, revision_number integer, snapshot jsonb, published_at timestamptz DEFAULT now());
    CREATE TABLE cms_faqs(id integer PRIMARY KEY, question text, answer jsonb, _status text, review_status text, review_notes text, updated_at timestamptz DEFAULT now());
    CREATE TABLE cms_contact_details(id integer PRIMARY KEY, email text, phone text, address text, office_hours text, _status text, review_status text, review_notes text, updated_at timestamptz DEFAULT now());
    CREATE TABLE app_eligibility_rule_set_versions(id uuid PRIMARY KEY, version_number integer, status text, published_at timestamptz DEFAULT now());
    CREATE TABLE app_eligibility_rules(id uuid PRIMARY KEY, version_id uuid, condition_group_id uuid, condition_id uuid,
      condition_kind text, failure_type text, applicant_message text, display_order integer, execution_mode text);
    CREATE TABLE app_eligibility_input_definitions(id uuid PRIMARY KEY, version_id uuid, stable_key text,
      label text, data_type text, available_in text[], display_order integer);
    CREATE TABLE app_eligibility_self_check_questions(input_definition_id uuid PRIMARY KEY, prompt text, help_text text,
      explanation text, answer_type text, required boolean, options jsonb);
    CREATE TABLE app_condition_groups(id uuid PRIMARY KEY, definition jsonb);
  `);
  const migration = await readFile(
    new URL(
      "../../drizzle/0188_chatbot_prepared_knowledge.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await pool.query(migration);
  await pool.query(migration);
  const lifecycle = await readFile(
    new URL(
      "../../drizzle/0189_chatbot_release_lifecycle.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await pool.query(lifecycle);
  await pool.query(lifecycle);
  const actor = chatbotActor();
  await pool.query("INSERT INTO app_users(id) VALUES ($1)", [actor.id]);
  const eligibility = chatbotEligibility();
  for (const [id, number, status] of [
    [chatbotId(20), 3, "RETIRED"],
    [chatbotId(21), 4, "PUBLISHED"],
    [chatbotId(22), 5, "DRAFT"],
  ]) {
    await pool.query(
      "INSERT INTO app_eligibility_rule_set_versions(id,version_number,status) VALUES ($1,$2,$3)",
      [id, number, status],
    );
  }
  await pool.query("INSERT INTO app_condition_groups VALUES ($1,$2)", [
    chatbotId(40),
    JSON.stringify(eligibility.groups[0].definition),
  ]);
  for (const [version, ruleId, inputId] of [
    [chatbotId(20), chatbotId(50), chatbotId(60)],
    [chatbotId(21), chatbotId(51), chatbotId(61)],
  ]) {
    await pool.query(
      "INSERT INTO app_eligibility_rules VALUES ($1,$2,$3,NULL,'GROUP','HARD_FAIL',$4,1,'SELF_CHECK')",
      [ruleId, version, chatbotId(40), eligibility.rules[0].applicantMessage],
    );
    await pool.query(
      "INSERT INTO app_eligibility_input_definitions VALUES ($1,$2,'employees','Employee count','NUMBER',ARRAY['SELF_CHECK'],1)",
      [inputId, version],
    );
    await pool.query(
      "INSERT INTO app_eligibility_self_check_questions VALUES ($1,'How many employees?','Count all employees.','Use the current count.','NUMBER',true,'[]')",
      [inputId],
    );
  }
  await pool.query(
    "INSERT INTO app_eligibility_rules VALUES ($1,$2,$3,NULL,'GROUP','HARD_FAIL','PRIVATE SCREENING MESSAGE',2,'SCREENING')",
    [chatbotId(52), chatbotId(20), chatbotId(40)],
  );
  for (const [id, revision, version, status] of [
    [chatbotId(10), chatbotId(30), chatbotId(20), "LIVE"],
    [chatbotId(11), chatbotId(31), chatbotId(21), "CLOSED"],
    [chatbotId(12), chatbotId(32), chatbotId(22), "DRAFT"],
    [chatbotId(13), chatbotId(33), chatbotId(20), "SUSPENDED"],
  ]) {
    const call = chatbotCall(id, version);
    await pool.query("INSERT INTO app_funding_calls VALUES ($1,$2,$3,$4)", [
      id,
      status,
      revision,
      chatbotId(22),
    ]);
    await pool.query(
      "INSERT INTO app_funding_call_publication_revisions(id,revision_number,snapshot) VALUES ($1,2,$2)",
      [
        revision,
        JSON.stringify({
          ...call.publicFields,
          eligibilityRuleSetVersionId: version,
          formVersionId: "PRIVATE-FORM",
          workflowTemplateVersionId: "PRIVATE-WORKFLOW",
          thumbnailObjectKey: "PRIVATE-STORAGE",
        }),
      ],
    );
  }
  const faqs = Array.from({ length: 125 }, (_, index) => {
    const id = index + 1;
    const faq = chatbotFaq(String(id));
    return {
      id,
      question: faq.question,
      answer: faq.answer,
      status: id === 124 ? "draft" : "published",
      review: id === 125 ? "inReview" : "approved",
    };
  });
  await pool.query(
    `INSERT INTO cms_faqs(id,question,answer,_status,review_status,review_notes) SELECT id, question, answer, status, review, 'PRIVATE REVIEW NOTES'
    FROM jsonb_to_recordset($1::jsonb) AS faq(id integer,question text,answer jsonb,status text,review text)`,
    [JSON.stringify(faqs)],
  );
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(pool) as ReturnType<typeof getDatabase>,
  );
  return {
    pool,
    actor,
    close: async () => {
      await pool.query(`DROP SCHEMA ${schema} CASCADE`);
      await pool.end();
    },
  };
}
