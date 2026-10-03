import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  afterAll,
  afterEach,
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
import * as schema from "@/db/schema";
import { respondToOwnedWorkflowRfi } from "@/modules/workflows/infrastructure/WorkflowRfiLifecycleRepository";
import { saveOwnedWorkflowRfiDraft } from "@/modules/workflows/infrastructure/WorkflowRfiCorrespondenceRepository";
import { readOwnedWorkflowRfi } from "@/modules/workflows/infrastructure/WorkflowRfiReadRepository";
import {
  assertWorkflowRfiFieldSelection,
  readWorkflowRfiFieldOptions,
} from "@/modules/workflows/infrastructure/WorkflowRfiFieldRepository";
import {
  workflowRfiResponseDefinition,
  workflowRfiResponseSchema,
} from "@/modules/workflows/ui/rfi/WorkflowRfiResponseForm";
import { formContextIds as id } from "../support/WorkflowEligibilityFormContextFixture";
import {
  installWorkflowDeadlineFixture,
  insertDeadlineRfi,
} from "../support/WorkflowDeadlineFixture";

const enabled = process.env.RUN_WORKFLOW_DEADLINE_DATABASE_TESTS === "true";
let pool: pg.Pool;
let client: pg.PoolClient;
let finishFixture: () => void;
let fixtureTransaction: Promise<unknown>;

async function installApplicationForm() {
  const definitionId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const sectionId = crypto.randomUUID();
  await client.query(
    "INSERT INTO app_form_definitions (id, code, name, purpose, created_by) VALUES ($1, $2, 'RFI application', 'FUNDING_APPLICATION', $3)",
    [definitionId, `RFI_${definitionId.replaceAll("-", "_")}`, id.actor],
  );
  await client.query(
    "INSERT INTO app_form_versions (id, form_definition_id, version_number, created_by) VALUES ($1, $2, 1, $3)",
    [versionId, definitionId, id.actor],
  );
  await client.query(
    "INSERT INTO app_form_sections (id, form_version_id, key, title, display_order) VALUES ($1, $2, 'PROJECT', 'Project', 1)",
    [sectionId, versionId],
  );
  await client.query(
    `INSERT INTO app_form_fields (form_version_id, section_id, key, label, type, required, minimum, maximum, min_length, display_order)
     VALUES ($1, $2, 'AMOUNT', 'Requested amount', 'NUMBER', true, 10, 1000, NULL, 1),
       ($1, $2, 'DESCRIPTION', 'Project description', 'TEXT', true, NULL, NULL, 3, 2),
       ($1, $2, 'DOCUMENT', 'Business plan', 'DOCUMENT', false, NULL, NULL, NULL, 3),
       ($1, $2, 'BUSINESS_LEGAL_NAME', 'Legal business name', 'TEXT', false, NULL, NULL, NULL, 4)`,
    [versionId, sectionId],
  );
  await client.query(
    "UPDATE app_form_versions SET status = 'PUBLISHED', published_by = $2, published_at = now(), row_version = row_version + 1 WHERE id = $1",
    [versionId, id.actor],
  );
  return {
    formVersionId: versionId,
    values: { AMOUNT: 100, DESCRIPTION: "Original description" },
  };
}

beforeAll(async () => {
  if (!enabled) return;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  client = await pool.connect();
  const ready = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  finishFixture = finish.resolve;
  fixtureTransaction = drizzle(client, { schema })
    .transaction(async (transaction) => {
      vi.mocked(getDatabase).mockReturnValue(transaction as never);
      await installWorkflowDeadlineFixture(client, installApplicationForm);
      ready.resolve();
      await finish.promise;
      throw new Error("ROLLBACK_RFI_FIXTURE");
    })
    .catch((error: Error) => {
      if (error.message !== "ROLLBACK_RFI_FIXTURE") ready.reject(error);
    });
  await ready.promise;
}, 30_000);
beforeEach(async () => {
  if (enabled) await client.query("SAVEPOINT rfi_case");
});
afterEach(async () => {
  if (enabled) await client.query("ROLLBACK TO SAVEPOINT rfi_case");
});
afterAll(async () => {
  finishFixture?.();
  await fixtureTransaction;
  client?.release();
  await pool?.end();
});

async function createRequest() {
  const requestId = await insertDeadlineRfi(client, "CLOSE_REQUEST", false);
  await client.query(
    "UPDATE app_workflow_rfis SET editable_field_paths = '[\"AMOUNT\"]' WHERE id = $1",
    [requestId],
  );
  return requestId;
}

function respond(
  requestId: string,
  values: Record<string, unknown>,
  actorId = id.actor,
) {
  return getDatabase().transaction((transaction) =>
    respondToOwnedWorkflowRfi(transaction, actorId, {
      requestInformationId: requestId,
      expectedRowVersion: 1,
      fieldValues: values,
      evidenceVersionIds: [],
      correlationId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
    }),
  );
}

(enabled ? describe : describe.skip)(
  "scoped applicant RFI edits against PostgreSQL",
  () => {
    it("projects real field labels and excludes unknown, business and document fields", async () => {
      const fields = await readWorkflowRfiFieldOptions(
        getDatabase(),
        id.application,
        [
          "AMOUNT",
          "UNKNOWN",
          "DOCUMENT",
          "BUSINESS_LEGAL_NAME",
          "CLARIFICATION_RESPONSE",
        ],
      );
      expect(fields).toEqual([
        { label: "Requested amount", path: "AMOUNT" },
        { label: "Written clarification", path: "CLARIFICATION_RESPONSE" },
      ]);
      await expect(
        assertWorkflowRfiFieldSelection(
          getDatabase() as never,
          id.application,
          ["UNKNOWN"],
        ),
      ).rejects.toThrow("this application's form");
    });

    it("loads only the requested field with its original validation constraints", async () => {
      const requestId = await createRequest();
      const detail = await readOwnedWorkflowRfi({
        applicationId: id.application,
        ownerUserId: id.actor,
        requestInformationId: requestId,
      });
      expect(detail?.editableFields.map((field) => field.path)).toEqual([
        "AMOUNT",
      ]);
      expect(detail?.editableFields[0]).toMatchObject({
        currentValue: 100,
        definition: { required: true, minimum: 10, maximum: 1000 },
      });
      const responseSchema = workflowRfiResponseSchema(
        workflowRfiResponseDefinition(detail!),
      );
      expect(
        responseSchema.safeParse({ fieldValues: { AMOUNT: 250 } }).success,
      ).toBe(true);
      expect(
        responseSchema.safeParse({ fieldValues: { AMOUNT: 2000 } }).success,
      ).toBe(false);
    });

    it("applies selected corrections, preserves locked answers and the snapshot, and audits before/after", async () => {
      const requestId = await createRequest();
      const snapshot = await client.query(
        "SELECT canonical_content, integrity_hash FROM app_application_submission_snapshots WHERE application_id = $1",
        [id.application],
      );
      expect(await respond(requestId, { AMOUNT: 250 })).toMatchObject({
        status: "RESPONDED",
      });
      const response = await client.query(
        "SELECT values FROM app_application_draft_responses WHERE application_id = $1",
        [id.application],
      );
      expect(response.rows[0].values).toEqual({
        AMOUNT: 250,
        DESCRIPTION: "Original description",
      });
      const unchanged = await client.query(
        "SELECT canonical_content, integrity_hash FROM app_application_submission_snapshots WHERE application_id = $1",
        [id.application],
      );
      expect(unchanged.rows).toEqual(snapshot.rows);
      const audit = await client.query(
        "SELECT after FROM app_workflow_audit_entries WHERE target_id = $1 AND action = 'RFI_RESPONDED'",
        [requestId],
      );
      expect(audit.rows[0].after.applicationFieldCorrections).toEqual({
        before: { AMOUNT: 100 },
        after: { AMOUNT: 250 },
        changedFieldKeys: ["AMOUNT"],
      });
      await expect(respond(requestId, { AMOUNT: 300 })).rejects.toThrow(
        "open information request",
      );
    });

    it.each([{ AMOUNT: 5 }, { AMOUNT: "250" }, {}])(
      "rejects invalid or missing requested values %j atomically",
      async (values) => {
        const requestId = await createRequest();
        await expect(respond(requestId, values)).rejects.toThrow();
        const response = await client.query(
          "SELECT values FROM app_application_draft_responses WHERE application_id = $1",
          [id.application],
        );
        expect(response.rows[0].values.AMOUNT).toBe(100);
        const records = await client.query(
          "SELECT id FROM app_workflow_rfi_responses WHERE rfi_id = $1",
          [requestId],
        );
        expect(records.rows).toHaveLength(0);
      },
    );

    it("denies unselected fields and a different recipient", async () => {
      const requestId = await createRequest();
      await expect(
        respond(requestId, { AMOUNT: 250, DESCRIPTION: "Changed" }),
      ).rejects.toThrow("not editable");
      await expect(
        respond(requestId, { AMOUNT: 250 }, id.otherActor),
      ).rejects.toThrow("open information request");
    });

    it("rejects responses and drafts after the deadline even before scheduled expiry", async () => {
      const requestId = await createRequest();
      await client.query(
        "UPDATE app_workflow_rfis SET deadline_at = now() - interval '1 minute' WHERE id = $1",
        [requestId],
      );
      await expect(respond(requestId, { AMOUNT: 250 })).rejects.toThrow(
        "deadline has passed",
      );
      await expect(
        getDatabase().transaction((transaction) =>
          saveOwnedWorkflowRfiDraft(transaction, id.actor, {
            requestInformationId: requestId,
            expectedRowVersion: 0,
            fieldValues: { AMOUNT: 250 },
          }),
        ),
      ).rejects.toThrow("deadline has passed");
    });
  },
);
