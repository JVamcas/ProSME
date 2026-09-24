import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0076_public_self_check_question_types.sql",
  ),
  "utf8",
);

describe("public eligibility Self Check question migration", () => {
  it("adds percentage without weakening the configured answer-type check", () => {
    expect(migration).toContain(
      'DROP CONSTRAINT "app_eligibility_questions_answer_type_check"',
    );
    expect(migration).toContain("'PERCENTAGE'");
    expect(migration).toContain("ADD CONSTRAINT");
  });

  it("does not add legacy authorization capabilities", () => {
    expect(migration).not.toContain("app_capabilities");
    expect(migration).not.toContain("app_role_capabilities");
  });
});
