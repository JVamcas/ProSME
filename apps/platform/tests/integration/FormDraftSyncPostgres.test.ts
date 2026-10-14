import { randomUUID } from "node:crypto";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { saveFormDraft } from "@/modules/forms/infrastructure/FormWriteRepository";
import {
  formFieldOptions,
  formFields,
  formSections,
  formVersions,
} from "@/modules/forms/infrastructure/form.schema";
import { duplicateFormField } from "@/modules/forms/domain/FormFieldOrdering";
import type { FormField, FormSection } from "@/modules/forms/FormTypes";

const enabled = process.env.RUN_FORM_DRAFT_SYNC_DATABASE_TESTS === "true";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
let client: PoolClient;
const versionId = randomUUID();
const otherVersion = randomUUID();
const definitionId = randomUUID();
const sections: FormSection[] = [
  {
    id: randomUUID(),
    key: "ONE",
    title: "First",
    order: 1,
    columnSpan: 3,
    showContainer: true,
    description: "",
  },
  {
    id: randomUUID(),
    key: "TWO",
    title: "Second",
    order: 2,
    columnSpan: 3,
    showContainer: true,
    description: "",
  },
];
const base: FormField = {
  id: randomUUID(),
  sectionId: sections[0].id!,
  key: "TEXT",
  label: "Text",
  type: "TEXT",
  order: 1,
  columnSpan: 1,
  required: false,
  options: [],
};
const fields: FormField[] = [
  base,
  {
    ...base,
    id: randomUUID(),
    key: "SELECT",
    type: "SINGLE_SELECT",
    order: 2,
    options: [
      { key: "YES", label: "Yes", order: 1 },
      { key: "NO", label: "No", order: 2 },
    ],
  },
  {
    ...base,
    id: randomUUID(),
    key: "DOCUMENT",
    type: "DOCUMENT",
    order: 3,
    acceptedExtensions: [".pdf"],
    maxPages: 12,
    maximumFileSizeMb: 4,
    uploadedBy: "ANY",
  },
  {
    ...base,
    id: randomUUID(),
    sectionId: sections[1].id!,
    key: "SCORE",
    type: "SCORE",
    order: 1,
    minimum: 0,
    maximum: 10,
  },
];
const queries: string[] = [];

function createTable(table: PgTable) {
  const name = getTableName(table);
  const columns = Object.values(getTableColumns(table)).map((column) => {
    const identifier =
      column.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : "";
    const required =
      column.notNull && table !== formVersions ? " NOT NULL" : "";
    return `"${column.name}" ${column.getSQLType()}${identifier}${required}`;
  });
  return `CREATE TEMP TABLE ${name} (${columns.join(", ")})`;
}
async function save(
  nextFields = fields,
  nextSections = sections,
  expectedRowVersion = 2,
) {
  return saveFormDraft({
    actorId: randomUUID(),
    definitionId,
    versionId,
    expectedRowVersion,
    fields: nextFields,
    sections: nextSections,
    submitLabel: "Save",
    displayMode: "STEPS",
  });
}
async function logRows() {
  return (
    await client.query(
      "SELECT table_name, row_id, operation FROM write_log ORDER BY sequence",
    )
  ).rows as { table_name: string; row_id: string; operation: string }[];
}
async function stored() {
  return (
    await client.query(
      "SELECT id, key, label, section_id, display_order FROM app_form_fields WHERE form_version_id = $1 ORDER BY key",
      [versionId],
    )
  ).rows;
}

beforeAll(async () => {
  if (!enabled) return;
  client = await pool.connect();
  await client.query("SET search_path = pg_temp");
  for (const table of [
    formVersions,
    formSections,
    formFields,
    formFieldOptions,
  ])
    await client.query(createTable(table));
  await client.query(`
    ALTER TABLE app_form_sections ADD UNIQUE (form_version_id, key), ADD UNIQUE (form_version_id, display_order), ADD UNIQUE (id, form_version_id), ADD CHECK (display_order > 0);
    ALTER TABLE app_form_fields ADD UNIQUE (form_version_id, key), ADD UNIQUE (section_id, display_order), ADD CHECK (display_order > 0), ADD FOREIGN KEY (section_id, form_version_id) REFERENCES app_form_sections (id, form_version_id);
    ALTER TABLE app_form_field_options ADD UNIQUE (field_id, key), ADD UNIQUE (field_id, display_order), ADD FOREIGN KEY (field_id) REFERENCES app_form_fields (id);
    CREATE TEMP TABLE write_log (sequence serial, table_name text, row_id uuid, operation text);
    CREATE FUNCTION pg_temp.record_write() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN INSERT INTO write_log(table_name,row_id,operation) VALUES (TG_TABLE_NAME, coalesce(NEW.id, OLD.id), TG_OP); RETURN coalesce(NEW, OLD); END; $$;
    CREATE TRIGGER section_writes AFTER INSERT OR UPDATE OR DELETE ON app_form_sections FOR EACH ROW EXECUTE FUNCTION pg_temp.record_write();
    CREATE TRIGGER field_writes AFTER INSERT OR UPDATE OR DELETE ON app_form_fields FOR EACH ROW EXECUTE FUNCTION pg_temp.record_write();
    CREATE TRIGGER option_writes AFTER INSERT OR UPDATE OR DELETE ON app_form_field_options FOR EACH ROW EXECUTE FUNCTION pg_temp.record_write();
  `);
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(client, {
      logger: { logQuery: (query) => queries.push(query) },
    }) as ReturnType<typeof getDatabase>,
  );
});
beforeEach(async () => {
  if (!enabled) return;
  await client.query(
    "TRUNCATE app_form_field_options, app_form_fields, app_form_sections, app_form_versions, write_log",
  );
  await client.query(
    "INSERT INTO app_form_versions (id, form_definition_id, status, row_version, metadata) VALUES ($1,$2,'DRAFT',1,'{}'), ($3,$2,'PUBLISHED',1,'{}')",
    [versionId, definitionId, otherVersion],
  );
  await save(fields, sections, 1);
  await client.query("TRUNCATE write_log");
  queries.length = 0;
});
afterAll(async () => {
  if (client) {
    client.release();
  }
  await pool.end();
});

(enabled ? describe : describe.skip)(
  "incremental PostgreSQL form draft saves",
  () => {
    it("updates one field without rewriting other fields, sections or options", async () => {
      await save(
        fields.map((field) =>
          field.id === base.id ? { ...field, label: "Renamed" } : field,
        ),
      );
      expect(await logRows()).toEqual([
        { table_name: "app_form_fields", row_id: base.id, operation: "UPDATE" },
      ]);
      expect(
        queries.filter((query) => !["begin", "commit"].includes(query)),
      ).toHaveLength(3);
      expect((await stored()).find((field) => field.id === base.id).label).toBe(
        "Renamed",
      );
    });
    it("does not write children on an unchanged or metadata-only save", async () => {
      await save();
      expect(await logRows()).toEqual([]);
      expect(
        queries.filter((query) => !["begin", "commit"].includes(query)),
      ).toHaveLength(2);
    });
    it("adds a field and preserves all existing rows and option IDs", async () => {
      await save([...fields, { ...base, id: undefined, key: "NEW", order: 4 }]);
      expect(await logRows()).toEqual([
        {
          table_name: "app_form_fields",
          row_id: expect.any(String),
          operation: "INSERT",
        },
      ]);
      expect(await stored()).toHaveLength(5);
    });
    it("duplicates a field with its options and only shifts fields that follow it", async () => {
      const next = duplicateFormField(fields, `field:${fields[1].id}`);
      await save(next);
      const log = await logRows();
      expect(
        log.filter((row) => row.table_name === "app_form_sections"),
      ).toEqual([]);
      expect(
        log.some(
          (row) =>
            row.row_id === base.id ||
            row.row_id === fields[1].id ||
            row.row_id === fields[3].id,
        ),
      ).toBe(false);
      expect(
        log
          .filter((row) => row.table_name === "app_form_field_options")
          .map((row) => row.operation),
      ).toEqual(["INSERT", "INSERT"]);
      expect(await stored()).toHaveLength(5);
    });
    it("deletes one field and its options, without touching another section", async () => {
      await save(
        fields
          .filter((field) => field.id !== fields[1].id)
          .map((field) =>
            field.id === fields[2].id ? { ...field, order: 2 } : field,
          ),
      );
      const log = await logRows();
      expect(log.filter((row) => row.operation === "DELETE")).toHaveLength(3);
      expect(
        log.some(
          (row) =>
            row.row_id === base.id ||
            row.row_id === fields[3].id ||
            row.table_name === "app_form_sections",
        ),
      ).toBe(false);
      expect(await stored()).toHaveLength(3);
    });
    it("supports field swaps, key swaps, moves and section reordering under unique constraints", async () => {
      const next = fields.map((field, index) =>
        index < 2
          ? { ...field, key: fields[1 - index].key, order: 2 - index }
          : field,
      );
      await save(
        next,
        sections.map((section) => ({ ...section, order: 3 - section.order })),
      );
      const moving = next.map((field) =>
        field.id === base.id
          ? { ...field, sectionId: sections[1].id!, order: 2 }
          : field.id === fields[2].id
            ? { ...field, order: 2 }
            : field,
      );
      await save(
        moving,
        sections.map((section) => ({ ...section, order: 3 - section.order })),
        3,
      );
      expect(
        (await stored()).find((field) => field.id === base.id).section_id,
      ).toBe(sections[1].id);
    });
    it("removes a section after moving a retained field to its destination", async () => {
      const next = fields.map((field) =>
        field.id === fields[3].id
          ? { ...field, sectionId: sections[0].id!, order: 4 }
          : field,
      );
      await save(next, [sections[0]]);
      expect(await stored()).toHaveLength(4);
      expect(
        (
          await client.query(
            "SELECT id FROM app_form_sections WHERE form_version_id=$1",
            [versionId],
          )
        ).rows,
      ).toHaveLength(1);
    });
    it("replaces only changed options and preserves document limits", async () => {
      await save(
        fields.map((field) =>
          field.id === fields[1].id
            ? {
                ...field,
                options: [...field.options!]
                  .reverse()
                  .map((option, index) => ({ ...option, order: index + 1 })),
              }
            : field,
        ),
      );
      expect(
        (await logRows()).every(
          (row) => row.table_name === "app_form_field_options",
        ),
      ).toBe(true);
      const document = (
        await client.query(
          "SELECT accepted_extensions,max_pages,maximum_file_size_mb FROM app_form_fields WHERE id=$1",
          [fields[2].id],
        )
      ).rows[0];
      expect(document).toEqual({
        accepted_extensions: [".pdf"],
        max_pages: 12,
        maximum_file_size_mb: 4,
      });
    });
    it("rejects stale revisions and published versions without child writes", async () => {
      expect(await save(fields, sections, 1)).toBeNull();
      const published = await saveFormDraft({
        actorId: randomUUID(),
        definitionId,
        versionId: otherVersion,
        expectedRowVersion: 1,
        fields,
        sections,
        submitLabel: "Save",
      });
      expect(published).toBeNull();
      expect(await logRows()).toEqual([]);
    });
    it("rolls back when an incoming field belongs to a different version", async () => {
      const foreignSection = randomUUID();
      const foreignField = randomUUID();
      await client.query(
        "INSERT INTO app_form_sections (id, form_version_id, key, title, description, column_span, show_container, display_order) VALUES ($1,$2,'FOREIGN','Foreign','',3,true,1)",
        [foreignSection, otherVersion],
      );
      await client.query(
        "INSERT INTO app_form_fields (id, form_version_id, section_id, column_span, key, label, type, required, display_order) VALUES ($1,$2,$3,1,'FOREIGN','Foreign','TEXT',false,1)",
        [foreignField, otherVersion, foreignSection],
      );
      await client.query("TRUNCATE write_log");
      await expect(
        save([
          ...fields,
          { ...base, id: foreignField, key: "FOREIGN", order: 4 },
        ]),
      ).rejects.toThrow();
      expect(await stored()).toHaveLength(4);
      expect(await logRows()).toEqual([]);
      expect(
        (
          await client.query(
            "SELECT row_version FROM app_form_versions WHERE id=$1",
            [versionId],
          )
        ).rows[0].row_version,
      ).toBe(2);
    });
  },
);
