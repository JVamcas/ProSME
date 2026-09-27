import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { operator } from "@/modules/conditions/domain/Operator";

import { defineStandardForm } from "./StandardFormBuilder";
import type { StandardFormSeed } from "./StandardFormDefinition";

export const coiDeclarationFormCode = "COI_DECLARATION";

function conflictDisclosed(): ConditionGroup {
  return {
    children: [
      {
        id: crypto.randomUUID(),
        kind: "CONDITION",
        leftOperand: { key: "HAS_CONFLICT", kind: "FIELD" },
        operator: operator("EQUALS"),
        rightOperand: { kind: "CONSTANT", value: true },
      },
    ],
    combinator: "AND",
    id: crypto.randomUUID(),
    kind: "GROUP",
  };
}

export function coiDeclarationForm(): StandardFormSeed {
  return {
    ...defineStandardForm({
      code: coiDeclarationFormCode,
      description:
        "Captures a reviewer's conflict-of-interest declaration before task access.",
      instructions: "Select the statement that applies to this assignment.",
      name: "Conflict of Interest Declaration",
      sections: [
        {
          fields: [
            {
              columnSpan: 2,
              helpText:
                "Choose Yes if a relationship or interest may affect your impartiality.",
              key: "HAS_CONFLICT",
              label: "Do you have a potential conflict of interest?",
              required: true,
              type: "YES_NO",
            },
            {
              columnSpan: 2,
              helpText:
                "Include the relationship or interest that may affect your impartiality.",
              key: "DISCLOSURE_TEXT",
              label: "Describe the potential conflict",
              maxLength: 4000,
              minLength: 1,
              required: true,
              type: "TEXTAREA",
              visibilityCondition: conflictDisclosed(),
            },
          ],
          key: "DECLARATION",
          showContainer: false,
          title: "Conflict of interest declaration",
        },
      ],
      submitLabel: "Submit declaration",
    }),
    publishOnSeed: true,
    purpose: "COI",
  };
}
