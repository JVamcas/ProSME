import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createOwnedApplication,
  findOwnedApplication,
  findOwnedApplicationByOpportunity,
  listOwnedApplications,
  updateOwnedApplication,
} from "@/db/repositories/ApplicationRepository";
import {
  hasRequiredApplicationDocuments,
  listOwnedApplicationDocuments,
  replaceOwnedApplicationDocument,
} from "@/db/repositories/ApplicationDocumentRepository";

const { Pool } = pg;
const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const firstOwnerId = "31111111-1111-4111-8111-111111111111";
const secondOwnerId = "32222222-2222-4222-8222-222222222222";
const opportunityId = 4242;
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function query(text: string, values: unknown[] = []) {
  if (!pool)
    throw new Error("The P3.2 PostgreSQL test pool is not configured.");
  return pool.query(text, values);
}

beforeAll(async () => {
  if (!enabled) return;
  await query(
    `INSERT INTO app_users
      (id, email, display_name, user_type, status)
     VALUES
      ($1, 'application-owner@example.test', 'Application Owner', 'applicant', 'active'),
      ($2, 'isolated-owner@example.test', 'Isolated Owner', 'applicant', 'active')`,
    [firstOwnerId, secondOwnerId],
  );
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("P3.2 PostgreSQL application persistence", () => {
  it("applies the table, indexes, constraints, and applicant capabilities", async () => {
    const result = await query(
      `SELECT
        to_regclass('app_applications') AS application_table,
        to_regclass('app_applications_owner_opportunity_unique') AS unique_index,
        to_regclass('app_applications_owner_updated_idx') AS list_index,
        (SELECT count(*)::integer FROM app_capabilities
          WHERE code IN ('application.create', 'application.read.own', 'application.update.own')) AS capability_count`,
    );
    expect(result.rows[0]).toEqual({
      application_table: "app_applications",
      capability_count: 3,
      list_index: "app_applications_owner_updated_idx",
      unique_index: "app_applications_owner_opportunity_unique",
    });
  });

  it("creates once, resumes by lookup, and isolates owners", async () => {
    const firstId = await createOwnedApplication({
      fundingOpportunityId: opportunityId,
      fundingOpportunityTitle: "Database Integration Fund",
      ownerUserId: firstOwnerId,
    });
    const duplicateId = await createOwnedApplication({
      fundingOpportunityId: opportunityId,
      fundingOpportunityTitle: "Database Integration Fund",
      ownerUserId: firstOwnerId,
    });
    const secondId = await createOwnedApplication({
      fundingOpportunityId: opportunityId,
      fundingOpportunityTitle: "Database Integration Fund",
      ownerUserId: secondOwnerId,
    });

    expect(firstId).toBeTruthy();
    expect(duplicateId).toBeNull();
    expect(secondId).toBeTruthy();
    await expect(
      findOwnedApplicationByOpportunity(firstOwnerId, opportunityId),
    ).resolves.toMatchObject({ id: firstId });
    await expect(
      findOwnedApplication(secondOwnerId, firstId!),
    ).resolves.toBeNull();

    const firstPage = await listOwnedApplications({
      limit: 1,
      ownerUserId: firstOwnerId,
    });
    expect(firstPage.total).toBe(1);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0].id).toBe(firstId);
  });

  it("allows only one of two concurrent stale-version writes", async () => {
    const application = await findOwnedApplicationByOpportunity(
      firstOwnerId,
      opportunityId,
    );
    expect(application).not.toBeNull();
    const input = {
      data: {},
      expectedRowVersion: application!.rowVersion,
      intent: "save" as const,
      section: "business" as const,
    };
    const completion = {
      business: false,
      declarations: false,
      documents: false,
      financial: false,
      project: false,
    };
    const results = await Promise.all([
      updateOwnedApplication(
        firstOwnerId,
        application!.id,
        input,
        completion,
        "business",
      ),
      updateOwnedApplication(
        firstOwnerId,
        application!.id,
        input,
        completion,
        "business",
      ),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((value) => value === null)).toHaveLength(1);
    await expect(
      findOwnedApplication(firstOwnerId, application!.id),
    ).resolves.toMatchObject({
      rowVersion: application!.rowVersion + 1,
    });
  });

  it("isolates supporting document metadata by application owner", async () => {
    const application = await findOwnedApplicationByOpportunity(
      firstOwnerId,
      opportunityId,
    );
    expect(application).not.toBeNull();
    await replaceOwnedApplicationDocument({
      applicationId: application!.id,
      contentType: "application/pdf",
      documentType: "business-registration",
      objectKey: `${firstOwnerId}/${application!.id}/registration.pdf`,
      originalName: "registration.pdf",
      ownerUserId: firstOwnerId,
      sizeBytes: 512,
    });

    await expect(
      listOwnedApplicationDocuments(firstOwnerId, application!.id),
    ).resolves.toMatchObject([
      {
        documentType: "business-registration",
        fileName: "registration.pdf",
        scanStatus: "pending",
      },
    ]);
    await expect(
      listOwnedApplicationDocuments(secondOwnerId, application!.id),
    ).resolves.toEqual([]);
    await expect(
      replaceOwnedApplicationDocument({
        applicationId: application!.id,
        contentType: "application/pdf",
        documentType: "tax-clearance",
        objectKey: `${secondOwnerId}/${application!.id}/tax-clearance.pdf`,
        originalName: "tax-clearance.pdf",
        ownerUserId: secondOwnerId,
        sizeBytes: 512,
      }),
    ).resolves.toBeUndefined();
    await expect(
      hasRequiredApplicationDocuments(firstOwnerId, application!.id, [
        "business-registration",
      ]),
    ).resolves.toBe(true);
  });
});
