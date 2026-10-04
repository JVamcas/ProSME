import { expect } from "vitest";
import { preflightOwnedApplication } from "@/modules/applications/infrastructure/ApplicationPreflightRepository";
import { expectNoNotificationOccurrences } from "./ApplicationSubmissionDatabaseAssertions";

type Query = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export async function assertMissingSubmissionWorkflow(
  query: Query,
  ownerId: string,
  applicationId: string,
) {
  const result = await preflightOwnedApplication({
    actorId: ownerId,
    applicationId,
  });
  expect(result?.ready).toBe(false);
  expect(result?.readinessToken).toBeNull();
  expect(result?.blockers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "INITIAL_WORKFLOW_STAGE_UNAVAILABLE" }),
    ]),
  );
  const application = await query(
    `SELECT status, reference FROM app_applications WHERE id = $1`,
    [applicationId],
  );
  expect(application.rows[0]).toEqual({ reference: null, status: "draft" });
  await expectNoNotificationOccurrences(query, applicationId);
}
