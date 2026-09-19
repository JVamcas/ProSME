import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getFormEditor } from "@/modules/forms/infrastructure/FormRepository";
import {
  cloneFormVersion,
  createForm,
  publishFormVersion,
  saveFormDraft,
} from "@/modules/forms/infrastructure/FormWriteRepository";
import type { FormField } from "@/modules/forms/FormTypes";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actorId = randomUUID();

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Additional form fields', 'staff', 'active')`,
    [actorId, `additional-fields-${actorId}@example.test`],
  );
});

afterAll(async () => {
  await pool?.end();
});

const options = [
  { key: "FIRST", label: "First option", order: 1 },
  { key: "SECOND", label: "Second option", order: 2 },
];

function field(
  sectionId: string,
  key: string,
  type: FormField["type"],
  order: number,
): FormField {
  return {
    columnSpan: 1,
    key,
    label: `${key} label`,
    options: type === "SINGLE_SELECT" || type === "MULTI_SELECT"
      ? options
      : [],
    order,
    required: false,
    sectionId,
    type,
  };
}

(enabled ? describe : describe.skip)("additional form field type storage", () => {
  it("persists, projects, publishes, and clones every additional type", async () => {
    const sectionId = randomUUID();
    const created = await createForm({
      actorId,
      code: `ADDITIONAL_${actorId.replaceAll("-", "").toUpperCase()}`,
      description: "Additional field types persistence test",
      name: "Additional field types persistence test",
      submitLabel: "Submit",
    });
    const fields = [
      field(sectionId, "AMOUNT", "CURRENCY", 1),
      field(sectionId, "REGION", "SINGLE_SELECT", 2),
      field(sectionId, "SECTORS", "MULTI_SELECT", 3),
      field(sectionId, "RATE", "PERCENTAGE", 4),
      field(sectionId, "EVIDENCE", "DOCUMENT", 5),
    ];
    const saved = await saveFormDraft({
      actorId,
      definitionId: created.definition.id,
      expectedRowVersion: 1,
      fields,
      sections: [{
        columnSpan: 3,
        description: "Additional fields",
        id: sectionId,
        key: "ADDITIONAL_FIELDS",
        order: 1,
        showContainer: true,
        title: "Additional fields",
      }],
      submitLabel: "Submit",
    });
    expect(saved?.rowVersion).toBe(2);

    const editor = await getFormEditor(created.definition.id);
    expect(editor?.fields).toEqual(fields.map((expected) => (
      expect.objectContaining({
        key: expected.key,
        options: expected.options,
        type: expected.type,
      })
    )));

    const publication = await publishFormVersion({
      actorId,
      definitionId: created.definition.id,
      expectedRowVersion: 2,
      versionId: created.version.id,
    });
    expect(publication.kind).toBe("published");

    const clone = await cloneFormVersion({
      actorId,
      definitionId: created.definition.id,
      sourceVersionId: created.version.id,
    });
    expect(clone).not.toBeNull();
    expect((await getFormEditor(created.definition.id))?.fields).toEqual(
      fields.map((expected) => expect.objectContaining({
        key: expected.key,
        options: expected.options,
        type: expected.type,
      })),
    );
  });
});
