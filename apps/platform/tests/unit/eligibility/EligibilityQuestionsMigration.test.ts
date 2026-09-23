import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0081_reusable_eligibility_questions.sql",
  ),
  "utf8",
);

const seedRepository = readFileSync(
  path.resolve(
    process.cwd(),
    "src/modules/eligibility/infrastructure/StandardEligibilitySeedRepository.ts",
  ),
  "utf8",
);

const verificationFormRepository = readFileSync(
  path.resolve(
    process.cwd(),
    "src/modules/eligibility/infrastructure/EligibilityVerificationFormRepository.ts",
  ),
  "utf8",
);

describe("reusable eligibility question migration", () => {
  it("creates a many-to-many question catalogue with immutable snapshots", () => {
    expect(migration).toContain('CREATE TABLE "app_eligibility_questions"');
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_rule_set_question_bindings"',
    );
    expect(migration).toContain(
      '"app_eligibility_question_bindings_version_question_unique"',
    );
    expect(migration).toContain("published eligibility question bindings are immutable");
  });

  it("generates reviewer forms from referenced Screening and Both questions", () => {
    expect(migration).toContain(
      'CREATE TABLE "app_eligibility_rule_set_verification_forms"',
    );
    expect(migration).toContain(
      "rule.execution_mode IN ('SCREENING', 'BOTH')",
    );
    expect(migration).toContain(
      "= 'eligibility.' || binding.code_snapshot",
    );
    expect(migration).not.toContain("text #>>");
  });

  it("removes Self Check-only questions from the next reviewer form", () => {
    expect(verificationFormRepository).toContain(
      "rule.execution_mode IN ('SCREENING', 'BOTH')",
    );
    expect(verificationFormRepository).not.toContain(
      "rule.execution_mode IN ('SELF_CHECK', 'SCREENING', 'BOTH')",
    );
  });

  it("seeds questions and bindings without legacy input/source records", () => {
    expect(seedRepository).toContain("eligibilityQuestions");
    expect(seedRepository).toContain("eligibilityRuleSetQuestionBindings");
    expect(seedRepository).not.toContain("eligibilityInputDefinitions");
    expect(seedRepository).not.toContain("eligibilityScreeningSourceBindings");
    expect(seedRepository).not.toContain("eligibilitySelfCheckQuestions");
  });

  it("allows application fields only in Screening rules", () => {
    expect(migration).toMatch(
      /LIKE 'application\.%'\s+AND rule\.execution_mode <> 'SCREENING'/,
    );
    expect(migration).toContain("NOT LIKE 'fundingCall.%'");
  });
});
