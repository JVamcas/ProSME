import type { Client } from "pg";

export const funnelTestSchema = `stage_funnel_test_${process.pid}`;

export const funnelId = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

async function createFunnelTables(client: Client) {
  await client.query(`CREATE SCHEMA ${funnelTestSchema}`);
  await client.query(`SET search_path TO ${funnelTestSchema}, pg_temp, public`);
  await client.query(`
    CREATE TEMP TABLE app_applications(id uuid, funding_opportunity_id uuid,
      funding_opportunity_title text, owner_user_id uuid, business_id uuid,
      submission_snapshot_id uuid, reference text, submitted_at timestamptz, deleted_at timestamptz);
    CREATE TEMP TABLE app_workflow_instances(id uuid, application_id uuid, workflow_template_version_id uuid);
    CREATE TEMP TABLE app_workflow_definition_versions(id uuid, created_at timestamptz, version_number integer);
    CREATE TEMP TABLE app_workflow_stage_definitions(id uuid, version_id uuid, code text, name text, sequence integer);
    CREATE TEMP TABLE app_workflow_stage_instances(id uuid, workflow_instance_id uuid,
      workflow_stage_definition_id uuid, status text, activated_at timestamptz, iteration_number integer);
    CREATE TEMP TABLE app_stage_task_definitions(id uuid, name text, reviewer_count integer, review_release text);
    CREATE TEMP TABLE app_workflow_tasks(id uuid, stage_instance_id uuid, workflow_task_definition_id uuid,
      assigned_user_id uuid, form_version_id uuid, status text, supersedes_task_id uuid, result jsonb);
    CREATE TEMP TABLE app_form_responses(id uuid, workflow_task_id uuid, respondent_user_id uuid,
      status text, values jsonb, definition_snapshot jsonb);
    CREATE TEMP TABLE app_workflow_reworks(source_stage_instance_id uuid);
    CREATE TEMP TABLE app_workflow_review_threshold_evaluations(stage_instance_id uuid,
      task_definition_id uuid, first_satisfied boolean);
    CREATE TEMP TABLE app_workflow_stage_scoring_configurations(task_definition_id uuid, aggregation text);
    CREATE TEMP TABLE app_workflow_stage_scoring_criteria(task_definition_id uuid,
      stable_key text, weight numeric, scale_maximum numeric, criterion text DEFAULT 'Quality');
    CREATE TEMP TABLE app_workflow_stage_comment_fields(task_definition_id uuid, key text, label text);
    CREATE TEMP TABLE app_users(id uuid, display_name text);
    CREATE TEMP TABLE app_business_profiles(id uuid, trading_name text, legal_name text,
      registration_number text, business_type text, sector text, region text);
    CREATE TEMP TABLE app_application_submission_snapshots(id uuid, canonical_content text, business_data jsonb);
    CREATE FUNCTION app_workflow_task_coi_cleared(uuid, uuid) RETURNS boolean
      LANGUAGE sql IMMUTABLE AS 'SELECT true';
  `);
}

export async function seedWorkflowStageFunnel(client: Client) {
  await createFunnelTables(client);
  await client.query("INSERT INTO app_users VALUES ($1, 'Live applicant')", [
    funnelId(900),
  ]);
  await client.query(
    "INSERT INTO app_business_profiles VALUES ($1, 'Edited business', 'Edited legal', 'EDITED', 'Company', 'Retail', 'Erongo')",
    [funnelId(901)],
  );
  await client.query(
    "INSERT INTO app_application_submission_snapshots VALUES ($1, $2, $3)",
    [
      funnelId(902),
      JSON.stringify({ applicant: { displayName: "Submitted applicant" } }),
      JSON.stringify({
        tradingName: "Submitted business",
        legalName: "Submitted legal",
        registrationNumber: "SNAPSHOT",
        businessType: "Company",
        sector: "Agriculture",
        region: "Khomas",
      }),
    ],
  );
  for (const version of [1, 2]) {
    await client.query(
      "INSERT INTO app_workflow_definition_versions VALUES ($1, $2, $3)",
      [funnelId(version), `2026-10-0${version}`, version],
    );
    for (const [index, key] of [
      "SCREEN",
      "FINANCIAL",
      version === 1 ? "OLD_STAGE" : "NEW_STAGE",
    ].entries()) {
      await client.query(
        "INSERT INTO app_workflow_stage_definitions VALUES ($1,$2,$3,$4,$5)",
        [
          funnelId(version * 10 + index),
          funnelId(version),
          key,
          `${key} v${version}`,
          index + 1,
        ],
      );
    }
  }
  await client.query(
    "INSERT INTO app_stage_task_definitions VALUES ($1, 'Financial review', 1, 'STAGE_COMPLETED'), ($2, 'Peer review', 2, 'STAGE_COMPLETED')",
    [funnelId(40), funnelId(41)],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_scoring_configurations VALUES ($1,'AVERAGE'),($2,'AVERAGE')",
    [funnelId(40), funnelId(41)],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_scoring_criteria(task_definition_id,stable_key,weight,scale_maximum) VALUES ($1,'QUALITY',1,10),($2,'QUALITY',1,5)",
    [funnelId(40), funnelId(41)],
  );
  for (let index = 1; index <= 7; index++) {
    const version = [1, 4, 5].includes(index) ? 1 : 2;
    await client.query(
      "INSERT INTO app_applications VALUES ($1,$2,'SME Growth 2026',$3,$4,$5,$6,'2026-10-01',$7)",
      [
        funnelId(100 + index),
        funnelId(index === 4 ? 81 : 80),
        funnelId(900),
        funnelId(901),
        funnelId(902),
        `APP-${index}`,
        index === 5 ? "2026-10-02" : null,
      ],
    );
    await client.query("INSERT INTO app_workflow_instances VALUES ($1,$2,$3)", [
      funnelId(200 + index),
      funnelId(100 + index),
      funnelId(version),
    ]);
    await client.query(
      "INSERT INTO app_workflow_stage_instances VALUES ($1,$2,$3,$4,$5,1)",
      [
        funnelId(300 + index),
        funnelId(200 + index),
        funnelId(version * 10 + (index === 3 ? 0 : 1)),
        index === 7 ? "ACTIVE" : "COMPLETED",
        `2026-10-${String(index + 1).padStart(2, "0")}`,
      ],
    );
    if (index === 3) continue;
    await client.query(
      "INSERT INTO app_workflow_tasks VALUES ($1,$2,$3,$4,NULL,'COMPLETED',NULL,$5)",
      [
        funnelId(400 + index),
        funnelId(300 + index),
        funnelId(index === 7 ? 41 : 40),
        funnelId(950),
        JSON.stringify({
          scores: [{ criterion: "QUALITY", score: index === 7 ? 2 : 8 }],
          comments: [{ key: "RECOMMENDATION", value: `Comment ${index}` }],
        }),
      ],
    );
  }
  // Application one returned. Its old score/comment must disappear from reporting.
  await client.query(
    "INSERT INTO app_workflow_stage_instances VALUES ($1,$2,$3,'COMPLETED','2026-10-09',2)",
    [funnelId(311), funnelId(201), funnelId(11)],
  );
  await client.query(
    "INSERT INTO app_workflow_tasks VALUES ($1,$2,$3,$4,NULL,'COMPLETED',NULL,$5)",
    [
      funnelId(411),
      funnelId(311),
      funnelId(40),
      funnelId(950),
      JSON.stringify({
        scores: [{ criterion: "QUALITY", score: 7 }],
        comments: [{ key: "RECOMMENDATION", value: "Latest recommendation" }],
      }),
    ],
  );
  await client.query(
    "INSERT INTO app_workflow_tasks VALUES ($1,$2,$3,$4,NULL,'COMPLETED',NULL,$5)",
    [
      funnelId(417),
      funnelId(307),
      funnelId(41),
      funnelId(951),
      JSON.stringify({
        scores: [{ criterion: "QUALITY", score: 5 }],
        comments: [{ key: "RECOMMENDATION", value: "Sealed peer comment" }],
      }),
    ],
  );
  const fields = [
    { key: "A", type: "SCORE", maximum: 10 },
    { key: "B", type: "SCORE", maximum: 10 },
    {
      key: "TOTAL",
      type: "SCORING_AGGREGATE",
      scoringAggregate: {
        method: "WEIGHTED_AVERAGE",
        normalization: "RAW",
        missing: "REQUIRE_ALL",
        sources: [
          { fieldKey: "A", weight: 1 },
          { fieldKey: "B", weight: 3 },
        ],
      },
    },
    { key: "COMMENT", type: "TEXTAREA", label: "Recommendation" },
  ];
  await client.query(
    "UPDATE app_workflow_tasks SET form_version_id = $1 WHERE id = $2",
    [funnelId(60), funnelId(406)],
  );
  await client.query(
    "INSERT INTO app_form_responses VALUES ($1,$2,$3,'COMPLETED',$4,$5)",
    [
      funnelId(61),
      funnelId(406),
      funnelId(950),
      JSON.stringify({
        A: 8,
        B: 2,
        TOTAL: 9999,
        COMMENT: "Form recommendation",
      }),
      JSON.stringify({ fields }),
    ],
  );
}
