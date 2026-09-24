import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getFormEditor,
} from "@/modules/forms/infrastructure/FormRepository";
import {
  cloneFormVersion,
  createForm,
  publishFormVersion,
  saveFormDraft,
} from "@/modules/forms/infrastructure/FormWriteRepository";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actorId = randomUUID();

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Form validation storage', 'staff', 'active')`,
    [actorId, `form-validation-${actorId}@example.test`],
  );
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("form validation rule storage", () => {
  it("persists, projects, and clones field validation rules", async () => {
    const sectionId = randomUUID();
    const created = await createForm({
      actorId,
      code: `VALIDATION_${actorId.replaceAll("-", "").toUpperCase()}`,
      description: "Validation persistence test",
      name: "Validation persistence test",
      submitLabel: "Submit",
    });
    const saved = await saveFormDraft({
      actorId,
      definitionId: created.definition.id,
      expectedRowVersion: 1,
      fields: [
        {
          columnSpan: 1,
          key: "DESCRIPTION",
          label: "Description",
          maxLength: 120,
          minLength: 10,
          order: 1,
          required: true,
          sectionId,
          type: "TEXTAREA",
        },
        {
          columnSpan: 1,
          key: "AMOUNT",
          label: "Amount",
          maximum: 1_000,
          minimum: 100,
          order: 2,
          required: false,
          sectionId,
          type: "NUMBER",
        },
      ],
      sections: [{
        columnSpan: 2,
        description: "Fields with validation",
        id: sectionId,
        key: "VALIDATION",
        order: 1,
        showContainer: true,
        title: "Validation",
      }],
      submitLabel: "Submit",
    });
    expect(saved?.rowVersion).toBe(2);

    const editor = await getFormEditor(created.definition.id);
    expect(editor?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "DESCRIPTION",
        maxLength: 120,
        minLength: 10,
      }),
      expect.objectContaining({
        key: "AMOUNT",
        maximum: 1_000,
        minimum: 100,
      }),
    ]));

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
      editor?.fields.map((field) => expect.objectContaining({
        key: field.key,
        maximum: field.maximum,
        maxLength: field.maxLength,
        minimum: field.minimum,
        minLength: field.minLength,
      })),
    );
  });
});
