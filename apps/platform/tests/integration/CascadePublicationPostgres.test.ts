import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowFormDocumentRepository",
  () => ({
    refreshFormDocumentRequirements: vi.fn(),
  }),
);
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallPublicationEffectsRepository",
  () => ({ capturePublicationEffects: vi.fn() }),
);
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityIntegrationVersionBindingRepository",
  () => ({ publishCallIntegrationBindings: vi.fn() }),
);
import { publishAttachedFormVersions } from "@/modules/forms/infrastructure/FormCascadePublicationRepository";
import { publishAttachedWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowCascadePublicationRepository";
import {
  actorId,
  client,
  database,
  enabled,
  seedForm,
  statuses,
  workflowId,
} from "../support/CascadePublicationDatabaseFixture";
import { queries } from "../support/CascadePublicationDatabaseFixture";
(enabled ? describe : describe.skip)(
  "cascading publication PostgreSQL transactions",
  () => {
    it("publishes many exact forms in a constant number of queries and skips published versions", async () => {
      const drafts = await Promise.all(
        Array.from({ length: 12 }, () => seedForm()),
      );
      const published = await seedForm("PUBLISHED");
      queries.length = 0;
      await database.transaction((transaction) =>
        publishAttachedFormVersions(
          transaction,
          [...drafts, ...drafts, published],
          actorId,
          vi.fn(),
        ),
      );
      expect(
        queries.filter((query) => !["begin", "commit"].includes(query)),
      ).toHaveLength(6);
      const rows = await statuses();
      expect(
        rows.filter(
          (row) => row.status === "PUBLISHED" && row.row_version === 2,
        ),
      ).toHaveLength(12);
      expect(rows.filter((row) => row.row_version === 1)).toHaveLength(1);
      const metadata = await client.query(
        "SELECT count(*)::int AS count FROM app_form_definitions WHERE name = 'Published name'",
      );
      expect(metadata.rows[0].count).toBe(12);
      queries.length = 0;
      await database.transaction((transaction) =>
        publishAttachedFormVersions(transaction, drafts, actorId, () => {
          throw new Error("Should not authorize again");
        }),
      );
      expect(queries.some((query) => /^\s*update /i.test(query))).toBe(false);
    });

    it("rolls back every form if a later parent publication fails", async () => {
      const ids = [await seedForm(), await seedForm()];
      await expect(
        database.transaction(async (transaction) => {
          await publishAttachedFormVersions(transaction, ids, actorId, vi.fn());
          throw new Error("Parent validation failed");
        }),
      ).rejects.toThrow("Parent validation failed");
      expect(await statuses()).toEqual([
        { status: "DRAFT", row_version: 1 },
        { status: "DRAFT", row_version: 1 },
      ]);
      expect(
        (
          await client.query("SELECT name FROM app_form_definitions")
        ).rows.every((row) => row.name === "Original"),
      ).toBe(true);
    });

    it("rejects invalid drafts without publishing valid siblings", async () => {
      const ids = [await seedForm(), await seedForm("DRAFT", false)];
      await expect(
        database.transaction((transaction) =>
          publishAttachedFormVersions(transaction, ids, actorId, vi.fn()),
        ),
      ).rejects.toThrow("Cannot publish form");
      expect(
        (await statuses()).every(
          (row) => row.status === "DRAFT" && row.row_version === 1,
        ),
      ).toBe(true);
    });

    it("publishes workflow, forms, and workflow audit in the same transaction", async () => {
      const ids = [await seedForm(), await seedForm()];
      const input = {
        actorId,
        correlationId: randomUUID(),
        idempotencyKey: randomUUID(),
        versionId: workflowId,
        authorize: vi.fn(),
        preparePublication: (
          transaction: Parameters<typeof publishAttachedFormVersions>[0],
        ) => publishAttachedFormVersions(transaction, ids, actorId, vi.fn()),
      };
      await database.transaction((transaction) =>
        publishAttachedWorkflowVersion(transaction, input),
      );
      expect(
        (await statuses()).every((row) => row.status === "PUBLISHED"),
      ).toBe(true);
      expect(
        (
          await client.query(
            "SELECT status, row_version FROM app_workflow_definition_versions",
          )
        ).rows,
      ).toEqual([{ status: "PUBLISHED", row_version: 2 }]);
      expect(
        (await client.query("SELECT action FROM app_workflow_audit_entries"))
          .rows,
      ).toEqual([{ action: "WORKFLOW_VERSION_PUBLISHED" }]);
      input.authorize.mockClear();
      await database.transaction((transaction) =>
        publishAttachedWorkflowVersion(transaction, input),
      );
      expect(input.authorize).not.toHaveBeenCalled();
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS count FROM app_workflow_audit_entries",
          )
        ).rows[0].count,
      ).toBe(1);
    });

    it("rolls back forms and workflow when the audit write fails", async () => {
      const versionId = await seedForm();
      const key = randomUUID();
      await client.query(
        "INSERT INTO app_workflow_audit_entries (idempotency_key) VALUES ($1)",
        [key],
      );
      await expect(
        database.transaction((transaction) =>
          publishAttachedWorkflowVersion(transaction, {
            actorId,
            correlationId: randomUUID(),
            idempotencyKey: key,
            versionId: workflowId,
            authorize: vi.fn(),
            preparePublication: (tx) =>
              publishAttachedFormVersions(tx, [versionId], actorId, vi.fn()),
          }),
        ),
      ).rejects.toThrow();
      expect(await statuses()).toEqual([{ status: "DRAFT", row_version: 1 }]);
      expect(
        (
          await client.query(
            "SELECT status, row_version FROM app_workflow_definition_versions",
          )
        ).rows,
      ).toEqual([{ status: "DRAFT", row_version: 1 }]);
    });
  },
);
