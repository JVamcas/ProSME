import { readFile } from "node:fs/promises";
import { installChatbotKnowledgeDatabaseFixture } from "./ChatbotKnowledgeDatabaseFixture";
import { chatbotId } from "./ChatbotKnowledgeFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import type {
  ChatbotArtifactStorage,
  StoredKnowledgeObject,
} from "@/modules/chatbot/infrastructure/ChatbotArtifactStorage";

export class MemoryChatbotStorage implements ChatbotArtifactStorage {
  objects = new Map<string, StoredKnowledgeObject>();
  failManifest = false;
  corruptRead = false;
  async putOnce(key: string, bytes: Buffer) {
    if (key.endsWith("manifest.json") && this.failManifest)
      throw new Error("Simulated manifest failure");
    const existing = this.objects.get(key);
    if (existing && !existing.bytes.equals(bytes))
      throw new Error("Immutable object differs");
    const object = existing ?? {
      bytes: Buffer.from(bytes),
      generation: String(this.objects.size + 1),
    };
    this.objects.set(key, object);
    return this.read(key);
  }
  async read(key: string) {
    const object = this.objects.get(key);
    if (!object) throw new Error("Missing object");
    return {
      bytes: this.corruptRead
        ? Buffer.from("corrupt")
        : Buffer.from(object.bytes),
      generation: object.generation,
    };
  }
}

export async function installChatbotRuntimeFixture(
  url: string,
  options = { enableChatbot: true },
) {
  const fixture = await installChatbotKnowledgeDatabaseFixture(url);
  const { pool, actor } = fixture;
  actor.capabilities = new Set(
    Object.entries(permissionCodes)
      .filter(([key]) => key.startsWith("chatbot"))
      .map(([, value]) => value),
  );
  await pool.query(`
    ALTER TABLE app_users ADD COLUMN display_name text NOT NULL DEFAULT 'Staff', ADD COLUMN email text NOT NULL DEFAULT 'staff@example.test', ADD COLUMN status text NOT NULL DEFAULT 'active', ADD COLUMN user_type text NOT NULL DEFAULT 'staff';
    ALTER TABLE app_capabilities ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
    CREATE UNIQUE INDEX fixture_permission_id ON app_capabilities(id);
    CREATE TABLE app_roles(id uuid PRIMARY KEY, name text, code text);
    CREATE TABLE app_user_roles(user_id uuid REFERENCES app_users(id),role_id uuid REFERENCES app_roles(id));
    CREATE TABLE app_role_capabilities(role_id uuid REFERENCES app_roles(id),capability_id uuid REFERENCES app_capabilities(id));
    CREATE TABLE app_reporting_reports(id uuid PRIMARY KEY);
  `);
  for (const name of [
    "0119_align_notification_rule_aggregate",
    "0131_notification_target_default_subjects",
    "0132_notification_specific_recipients",
    "0139_authentication_notification_events",
    "0141_notification_dead_letter",
    "0180_reporting_notification_scope",
    "0190_chatbot_conversations_and_cases",
    "0191_chatbot_application_settings",
    "0192_chatbot_resource_activation",
    "0193_chatbot_case_references",
  ]) {
    const migration = await readFile(
      new URL(`../../drizzle/${name}.sql`, import.meta.url),
      "utf8",
    );
    await pool.query(migration);
  }
  await pool.query(
    await readFile(
      new URL(
        "../../drizzle/0190_chatbot_conversations_and_cases.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const settingsMigration = await readFile(
    new URL(
      "../../drizzle/0191_chatbot_application_settings.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await pool.query(settingsMigration);
  await pool.query(
    await readFile(
      new URL(
        "../../drizzle/0192_chatbot_resource_activation.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (options.enableChatbot) {
    await pool.query(
      "UPDATE app_chatbot_settings SET public_enabled = true, model_enabled = true",
    );
  }
  await pool.query("INSERT INTO app_roles VALUES ($1,'Support','support')", [
    chatbotId(900),
  ]);
  await pool.query("INSERT INTO app_user_roles VALUES ($1,$2)", [
    actor.id,
    chatbotId(900),
  ]);
  await pool.query(
    "INSERT INTO app_role_capabilities SELECT $1,id FROM app_capabilities WHERE code LIKE 'chatbot.%'",
    [chatbotId(900)],
  );
  await pool.query(
    `INSERT INTO app_notification_event_rules(id,event_id,description) SELECT $1,id,'Fixture support rule' FROM app_notification_events WHERE event_key='chatbot.case.created' ON CONFLICT DO NOTHING`,
    [chatbotId(901)],
  );
  await pool.query(
    `INSERT INTO app_notification_event_rule_recipients(id,rule_id,recipient_type,recipient_user_id) VALUES ($1,$2,'SPECIFIC_USER',$3)`,
    [chatbotId(902), chatbotId(901), actor.id],
  );
  await pool.query(
    `INSERT INTO app_notification_channels(id,code,display_name,channel_type) VALUES ($1,'EMAIL','Email','EMAIL') ON CONFLICT DO NOTHING`,
    [chatbotId(903)],
  );
  const channel = (
    await pool.query(
      "SELECT id FROM app_notification_channels WHERE code='EMAIL'",
    )
  ).rows[0].id;
  await pool.query(
    "INSERT INTO app_notification_event_rule_channels(id,rule_recipient_id,channel_id) VALUES ($1,$2,$3)",
    [chatbotId(904), chatbotId(902), channel],
  );
  await pool.query(
    `INSERT INTO app_notification_template_targets(id,channel_id,scope,event_id) SELECT $1,$2,'EVENT',id FROM app_notification_events WHERE event_key='chatbot.case.created'`,
    [chatbotId(905), channel],
  );
  await pool.query(
    `INSERT INTO app_notification_template_versions(id,template_target_id,version_number,source_file_name,media_type,subject_template,html_template,plain_text_template,content_sha256,status,uploaded_by_user_id)
    VALUES ($1,$2,1,'case.html','text/html','Case {{caseReference}}','<p><a href="{{caseUrl}}">Review {{caseReference}}</a></p>','Review {{caseReference}}: {{caseUrl}}',$3,'PUBLISHED',$4)`,
    [chatbotId(906), chatbotId(905), "a".repeat(64), actor.id],
  );
  return fixture;
}
