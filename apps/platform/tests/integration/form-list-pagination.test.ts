import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listForms } from "@/modules/forms/infrastructure/FormRepository";

const enabled = process.env.RUN_P3_WORKFLOW_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actorId = randomUUID();

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Form pagination storage', 'staff', 'active')`,
    [actorId, `form-pagination-${actorId}@example.test`],
  );
  const definitionIds = Array.from({ length: 12 }, () => randomUUID());
  const versionIds = Array.from({ length: 12 }, () => randomUUID());
  await Promise.all(definitionIds.map((definitionId, index) => (
    pool.query(
      `INSERT INTO app_form_definitions
        (id, code, name, description, created_by)
       VALUES ($1, $2, $3, '', $4)`,
      [
        definitionId,
        `PAGE_${index}_${actorId.replaceAll("-", "").toUpperCase()}`,
        `000 Pagination ${String(index + 1).padStart(2, "0")}`,
        actorId,
      ],
    )
  )));
  await Promise.all(versionIds.map((versionId, index) => (
    pool.query(
      `INSERT INTO app_form_versions
        (id, form_definition_id, version_number, status, created_by)
       VALUES ($1, $2, 1, 'DRAFT', $3)`,
      [versionId, definitionIds[index], actorId],
    )
  )));
});

afterAll(async () => {
  await pool?.end();
});

(enabled ? describe : describe.skip)("form list pagination", () => {
  it("counts and pages the form projection in PostgreSQL", async () => {
    const [first, second] = await Promise.all([
      listForms({ page: 1, pageSize: 5 }),
      listForms({ page: 2, pageSize: 5 }),
    ]);

    expect(first.items).toHaveLength(5);
    expect(second.items).toHaveLength(5);
    expect(first.total).toBeGreaterThanOrEqual(12);
    expect(first.totalPages).toBe(Math.ceil(first.total / 5));
    expect(new Set([
      ...first.items.map((item) => item.id),
      ...second.items.map((item) => item.id),
    ]).size).toBe(10);
    expect(first.items[0]).toEqual(expect.objectContaining({
      fieldCount: 0,
      latestStatus: "DRAFT",
      latestVersion: 1,
      latestVersionId: expect.any(String),
      latestVersionRowVersion: 1,
      sectionCount: 0,
      usedByCount: 0,
    }));
  });
});
