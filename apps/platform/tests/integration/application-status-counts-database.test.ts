import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listOwnedApplications } from "@/db/repositories/ApplicationRepository";

const { Pool } = pg;
const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const ownerId = "a1111111-1111-4111-8111-111111111111";
const definitionId = "a2222222-2222-4222-8222-222222222222";
const versionId = "a3333333-3333-4333-8333-333333333333";
const stageDefinitionId = "a4444444-4444-4444-8444-444444444444";
const applicationIds = {
  completed: "a5555555-5555-4555-8555-555555555551",
  draft: "a5555555-5555-4555-8555-555555555552",
  review: "a5555555-5555-4555-8555-555555555553",
  submitted: "a5555555-5555-4555-8555-555555555554",
};
const reviewWorkflowId = "a6666666-6666-4666-8666-666666666661";
const completedWorkflowId = "a6666666-6666-4666-8666-666666666662";
const reviewStageId = "a7777777-7777-4777-8777-777777777771";
const completedStageId = "a7777777-7777-4777-8777-777777777772";
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The application test database is unavailable.");
  return pool.query(text, values);
}

beforeAll(async () => {
  if (!enabled) return;
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'status-owner@example.test', 'Status Owner', 'applicant', 'active')`,
    [ownerId],
  );
  await query(
    `INSERT INTO app_workflow_definitions (id, code, name)
     VALUES ($1, 'STATUS_COUNT_TEST', 'Status count test')`,
    [definitionId],
  );
  await query(
    `INSERT INTO app_workflow_definition_versions
       (id, definition_id, version_number, status, created_by)
     VALUES ($1, $2, 1, 'PUBLISHED', $3)`,
    [versionId, definitionId, ownerId],
  );
  await query(
    `INSERT INTO app_workflow_stage_definitions
       (id, version_id, code, name, sequence, initial, applicant_status,
        applicant_label, applicant_description)
     VALUES ($1, $2, 'REVIEW', 'Review', 1, true, 'UNDER_REVIEW',
       'Under review', 'Your application is under review.')`,
    [stageDefinitionId, versionId],
  );
  await query(
    `INSERT INTO app_applications
       (id, owner_user_id, funding_opportunity_id, funding_opportunity_title,
        reference, status, submitted_at, workflow_version_id)
     VALUES
       ($1, $5, 7101, 'Completed fund', 'STATUS-001', 'submitted', now(), $6),
       ($2, $5, 7102, 'Draft fund', null, 'draft', null, null),
       ($3, $5, 7103, 'Review fund', 'STATUS-002', 'submitted', now(), $6),
       ($4, $5, 7104, 'Submitted fund', 'STATUS-003', 'submitted', now(), $6)`,
    [
      applicationIds.completed,
      applicationIds.draft,
      applicationIds.review,
      applicationIds.submitted,
      ownerId,
      versionId,
    ],
  );
  await query(
    `INSERT INTO app_workflow_instances
       (id, application_id, workflow_version_id, status)
     VALUES ($1, $3, $5, 'ACTIVE'), ($2, $4, $5, 'COMPLETED')`,
    [
      reviewWorkflowId,
      completedWorkflowId,
      applicationIds.review,
      applicationIds.completed,
      versionId,
    ],
  );
  await query(
    `INSERT INTO app_workflow_stage_instances
       (id, workflow_instance_id, stage_definition_id, status)
     VALUES ($1, $3, $5, 'ACTIVE'), ($2, $4, $5, 'COMPLETED')`,
    [
      reviewStageId,
      completedStageId,
      reviewWorkflowId,
      completedWorkflowId,
      stageDefinitionId,
    ],
  );
  await query(
    `UPDATE app_workflow_instances
     SET current_stage_instance_id = CASE id
       WHEN $1::uuid THEN $3::uuid ELSE $4::uuid END
     WHERE id IN ($1::uuid, $2::uuid)`,
    [reviewWorkflowId, completedWorkflowId, reviewStageId, completedStageId],
  );
});

afterAll(async () => pool?.end());

describeDatabase("application status aggregates", () => {
  it("returns owner-wide counts while filtering the requested category", async () => {
    const review = await listOwnedApplications({
      limit: 10,
      ownerUserId: ownerId,
      status: "under-review",
    });
    const completed = await listOwnedApplications({
      limit: 10,
      ownerUserId: ownerId,
      status: "completed",
    });

    expect(review.counts).toEqual({
      all: 4,
      completed: 1,
      draft: 1,
      submitted: 1,
      underReview: 1,
    });
    expect(review.items.map((item) => item.id)).toEqual([
      applicationIds.review,
    ]);
    expect(review.total).toBe(1);
    expect(completed.items.map((item) => item.id)).toEqual([
      applicationIds.completed,
    ]);
    expect(completed.total).toBe(1);
  });
});
