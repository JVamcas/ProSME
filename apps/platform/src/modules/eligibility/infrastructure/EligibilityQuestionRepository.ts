import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  EligibilityQuestionInput,
  EligibilityQuestionListInput,
  EligibilityQuestionUpdateInput,
} from "../api/EligibilityQuestionSchemas";
import type { EligibilityQuestionPage } from "../api/EligibilityQuestionTransport";
import { eligibilityQuestions } from "./eligibility-question.schema";

export async function listAvailableEligibilityQuestions() {
  return getDatabase()
    .select({
      applicantLabel: eligibilityQuestions.applicantLabel,
      code: eligibilityQuestions.code,
      id: eligibilityQuestions.id,
      inputType: eligibilityQuestions.inputType,
      reviewerLabel: eligibilityQuestions.reviewerLabel,
    })
    .from(eligibilityQuestions)
    .where(eq(eligibilityQuestions.active, true))
    .orderBy(asc(eligibilityQuestions.code));
}

export async function listEligibilityQuestions(
  input: EligibilityQuestionListInput,
): Promise<EligibilityQuestionPage> {
  const database = getDatabase();
  const offset = (input.page - 1) * input.pageSize;
  const [rows, countRows] = await Promise.all([
    database.execute(sql`
      SELECT question.id,
        question.code,
        question.input_type AS "inputType",
        question.applicant_label AS "applicantLabel",
        question.reviewer_label AS "reviewerLabel",
        question.active,
        question.row_version AS "rowVersion",
        to_char(
          question.updated_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        ) AS "updatedAt",
        count(binding.id)::integer AS "bindingCount"
      FROM app_eligibility_questions question
      LEFT JOIN app_eligibility_rule_set_question_bindings binding
        ON binding.question_id = question.id
      GROUP BY question.id
      ORDER BY question.code, question.id
      LIMIT ${input.pageSize}
      OFFSET ${offset}
    `),
    database.execute(sql`
      SELECT count(*)::integer AS total
      FROM app_eligibility_questions
    `),
  ]);
  const total = Number(countRows.rows[0]?.total ?? 0);
  return {
    items: rows.rows as EligibilityQuestionPage["items"],
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

export async function insertEligibilityQuestion(input: {
  actorId: string;
  definition: EligibilityQuestionInput;
}) {
  const [created] = await getDatabase()
    .insert(eligibilityQuestions)
    .values({
      ...input.definition,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();
  return created!;
}

export async function updateEligibilityQuestion(input: {
  actorId: string;
  definition: EligibilityQuestionUpdateInput;
  questionId: string;
}) {
  const { expectedRowVersion, ...definition } = input.definition;
  const [updated] = await getDatabase()
    .update(eligibilityQuestions)
    .set({
      ...definition,
      rowVersion: sql`${eligibilityQuestions.rowVersion} + 1`,
      updatedAt: new Date(),
      updatedBy: input.actorId,
    })
    .where(and(
      eq(eligibilityQuestions.id, input.questionId),
      eq(eligibilityQuestions.rowVersion, expectedRowVersion),
    ))
    .returning();
  return updated ?? null;
}
