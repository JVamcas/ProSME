import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type {
  WorkflowStageApplication,
  WorkflowStageFunnelQuery,
} from "../api/WorkflowStageFunnelTypes";
import { workflowStageFunnelLatestRuns } from "./WorkflowStageFunnelScope";
import { workflowStageFunnelEvidence } from "./WorkflowStageFunnelEvidenceSql";

type DatabaseRow = Omit<
  WorkflowStageApplication,
  "reachedAt" | "submittedAt" | "averageScore" | "scoreMaximum"
> & {
  reachedAt: Date | string;
  submittedAt: Date | string | null;
  averageScore: string | number | null;
  scoreMaximum: string | number | null;
};

type Executor = Pick<ReturnType<typeof getDatabase>, "execute">;

export async function readWorkflowStageApplications(
  fundingCallId: string,
  actorId: string,
  query: WorkflowStageFunnelQuery,
  executor: Executor = getDatabase(),
) {
  const result = await executor.execute(sql`
    WITH latest_runs AS (${workflowStageFunnelLatestRuns(fundingCallId, query.stageKey)}),
    page_runs AS (
      SELECT application_id, stage_id, status, activated_at, iteration_number, stage_name
      FROM latest_runs ORDER BY activated_at DESC, application_id DESC
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    ), ${workflowStageFunnelEvidence(actorId)},
    items AS (
      SELECT application.id AS "applicationId", application.reference,
        COALESCE(NULLIF(snapshot.canonical_content::jsonb->'applicant'->>'displayName', ''),
          applicant.display_name) AS "applicantName",
        COALESCE(NULLIF(details.business->>'tradingName', ''),
          details.business->>'legalName') AS "businessName",
        details.business->>'legalName' AS "legalName",
        details.business->>'registrationNumber' AS "registrationNumber",
        details.business->>'businessType' AS "businessType",
        details.business->>'sector' AS sector,
        details.business->>'region' AS region,
        run.activated_at AS "reachedAt", application.submitted_at AS "submittedAt",
        application.funding_opportunity_title AS "fundingCallTitle",
        run.stage_name AS "stageName",
        run.iteration_number AS "iterationNumber", scores.average_score AS "averageScore",
        scores.score_maximum AS "scoreMaximum", scores.score_unit AS "scoreUnit",
        comments.comments
      FROM page_runs run
      JOIN app_applications application ON application.id = run.application_id
      JOIN app_users applicant ON applicant.id = application.owner_user_id
      LEFT JOIN app_business_profiles business ON business.id = application.business_id
      LEFT JOIN app_application_submission_snapshots snapshot ON snapshot.id = application.submission_snapshot_id
      CROSS JOIN LATERAL (SELECT COALESCE(snapshot.business_data, jsonb_build_object(
        'tradingName', business.trading_name, 'legalName', business.legal_name,
        'registrationNumber', business.registration_number, 'businessType', business.business_type,
        'sector', business.sector, 'region', business.region
      )) AS business) details
      LEFT JOIN stage_scores scores ON scores.stage_instance_id = run.stage_id
      LEFT JOIN stage_comments comments ON comments.stage_instance_id = run.stage_id
      ORDER BY run.activated_at DESC, application.id DESC
    )
    SELECT (SELECT count(*)::integer FROM latest_runs) AS total,
      COALESCE((SELECT jsonb_agg(items ORDER BY items."reachedAt" DESC,
        items."applicationId" DESC) FROM items), '[]'::jsonb) AS items
  `);
  const row = result.rows[0] as { total: number; items: DatabaseRow[] };
  return {
    total: row.total,
    items: row.items.map((item): WorkflowStageApplication => ({
      ...item,
      reference: item.reference ?? "—",
      reachedAt: new Date(item.reachedAt).toISOString(),
      submittedAt: item.submittedAt
        ? new Date(item.submittedAt).toISOString()
        : null,
      scoreMaximum:
        item.scoreMaximum === null ? null : Number(item.scoreMaximum),
      averageScore:
        item.averageScore === null ? null : Number(item.averageScore),
    })),
  };
}

export async function consumeWorkflowStageApplications(
  fundingCallId: string,
  actorId: string,
  stageKey: string,
  signal: AbortSignal,
  consume: (items: WorkflowStageApplication[]) => Promise<void>,
) {
  await getDatabase().transaction(async (transaction) => {
    await transaction.execute(
      sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`,
    );
    let page = 1;
    let total = 0;
    do {
      signal.throwIfAborted();
      const result = await readWorkflowStageApplications(
        fundingCallId,
        actorId,
        { stageKey, page, pageSize: 100 },
        transaction,
      );
      await consume(result.items);
      total = result.total;
      page++;
    } while ((page - 1) * 100 < total);
  });
}
