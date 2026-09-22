ALTER TABLE "app_eligibility_self_check_questions"
  DROP CONSTRAINT "app_eligibility_questions_answer_type_check";
--> statement-breakpoint
ALTER TABLE "app_eligibility_self_check_questions"
  ADD CONSTRAINT "app_eligibility_questions_answer_type_check" CHECK (
    "answer_type" IN (
      'BOOLEAN', 'YES_NO_NA', 'TEXT', 'NUMBER', 'PERCENTAGE', 'DATE',
      'SINGLE_SELECT', 'MULTI_SELECT'
    )
  );
