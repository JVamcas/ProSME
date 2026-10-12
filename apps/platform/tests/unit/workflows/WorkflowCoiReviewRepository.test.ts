import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import {
  readPendingWorkflowCoiReview,
  readPendingWorkflowCoiReviews,
} from "@/modules/workflows/infrastructure/WorkflowCoiReviewRepository";

const execute = vi.fn();
const actorId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue({ rows: [] });
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

function compiledQuery(callIndex = 0) {
  return new PgDialect().sqlToQuery(execute.mock.calls[callIndex]![0]);
}

describe("workflow COI review projection", () => {
  it("excludes the signed-in person's own disclosure from the queue", async () => {
    await readPendingWorkflowCoiReviews(actorId, { page: 1, pageSize: 25 });

    const query = compiledQuery();
    expect(query.sql).toContain("clearance.user_id <>");
    expect(query.params).toContain(actorId);
    expect(query.sql).toContain("clearance.state = 'PENDING_REVIEW'");
  });

  it("denies self-review through the detail projection as well", async () => {
    await expect(
      readPendingWorkflowCoiReview(actorId, taskId),
    ).resolves.toBeNull();

    const query = compiledQuery();
    expect(query.sql).toContain("clearance.user_id <>");
    expect(query.params).toContain(actorId);
    expect(query.params).toContain(taskId);
  });
});


it("projects the captured form and answers only in the scoped review detail", async () => {
  const answers = { HAS_CONFLICT: true, SIGNATURE: "Reviewer", ACKNOWLEDGEMENT: true };
  const form = { versionId: "33333333-3333-4333-8333-333333333333" };
  execute.mockResolvedValueOnce({ rows: [{
    taskId, subjectUserId: "44444444-4444-4444-8444-444444444444",
    submittedAt: "2026-10-12T12:00:00Z", formValues: answers, form,
  }] }).mockResolvedValueOnce({ rows: [] });
  const detail = await readPendingWorkflowCoiReview(actorId, taskId);
  expect(detail).toMatchObject({ formValues: answers, form });
  const query = compiledQuery();
  expect(query.sql).toContain('disclosure.form_values AS "formValues"');
  expect(query.sql).toContain("event.subject_user_id = clearance.user_id");
  expect(query.sql).toContain("event.form_version_id = clearance.form_version_id");
});
