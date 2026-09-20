import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { operator } from "@/modules/conditions/domain/Operator";
import type {
  FormField,
  FormFieldType,
  FormOption,
  FormSection,
} from "@/modules/forms/FormTypes";

type FieldInput = {
  columnSpan?: 1 | 2 | 3;
  helpText?: string;
  key: string;
  label: string;
  maximum?: number;
  minimum?: number;
  options?: readonly string[];
  required?: boolean;
  type: FormFieldType;
  visibilityCondition?: ConditionGroup;
};

type SectionInput = {
  description?: string;
  fields: FieldInput[];
  key: string;
  title: string;
};

export type StandardFormDraft = {
  code: string;
  description: string;
  fields: FormField[];
  instructions: string;
  name: string;
  sections: FormSection[];
  submitLabel: string;
};

function formOptions(labels: readonly string[]): FormOption[] {
  return labels.map((label, index) => ({
    key: label.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_"),
    label,
    order: index + 1,
  }));
}

function equals(fieldKey: string, value: boolean): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    kind: "GROUP",
    combinator: "AND",
    children: [{
      id: crypto.randomUUID(),
      kind: "CONDITION",
      leftOperand: { kind: "FIELD", key: fieldKey },
      operator: operator("EQUALS"),
      rightOperand: { kind: "CONSTANT", value },
    }],
  };
}

function defineForm(input: {
  code: string;
  description: string;
  instructions: string;
  name: string;
  sections: SectionInput[];
  submitLabel?: string;
}): StandardFormDraft {
  const sections = input.sections.map((section, index): FormSection => ({
    id: crypto.randomUUID(),
    columnSpan: 2,
    description: section.description ?? "",
    key: section.key,
    order: index + 1,
    showContainer: true,
    title: section.title,
  }));
  const fields = input.sections.flatMap((section, sectionIndex) => (
    section.fields.map((field, fieldIndex): FormField => ({
      columnSpan: field.columnSpan ?? 1,
      helpText: field.helpText,
      key: field.key,
      label: field.label,
      maximum: field.maximum,
      minimum: field.minimum,
      options: field.options ? formOptions(field.options) : undefined,
      order: fieldIndex + 1,
      required: field.required ?? false,
      sectionId: sections[sectionIndex].id!,
      type: field.type,
      visibilityCondition: field.visibilityCondition,
    }))
  ));
  return {
    code: input.code,
    description: input.description,
    fields,
    instructions: input.instructions,
    name: input.name,
    sections,
    submitLabel: input.submitLabel ?? "Complete task",
  };
}

const riskOptions = ["Low", "Medium", "High", "Critical"] as const;

function technicalReview(): StandardFormDraft {
  return defineForm({
    code: "TECHNICAL_REVIEW",
    name: "Technical Review Form",
    description: "Captures a technical reviewer's narrative and recommendation.",
    instructions: "Complete the assessment after reviewing the application and configured scoring criteria.",
    sections: [
      {
        key: "ASSESSMENT_COMMENTARY",
        title: "Assessment commentary",
        fields: [
          { key: "STRENGTHS", label: "Strengths", type: "TEXTAREA", required: true, columnSpan: 2 },
          { key: "WEAKNESSES", label: "Weaknesses", type: "TEXTAREA", required: true, columnSpan: 2 },
          { key: "REVIEWER_CONFIDENCE_RATING", label: "Reviewer confidence rating", type: "NUMBER", required: true, minimum: 1, maximum: 5 },
        ],
      },
      {
        key: "RECOMMENDATION",
        title: "Recommendation",
        fields: [
          { key: "RECOMMENDED_AMOUNT", label: "Recommended amount", type: "CURRENCY", minimum: 0 },
          { key: "RECOMMENDED_CONDITIONS", label: "Recommended conditions", type: "TEXTAREA", columnSpan: 2 },
          { key: "ADDITIONAL_COMMENTS", label: "Additional comments", type: "TEXTAREA", columnSpan: 2 },
        ],
      },
    ],
  });
}

function dueDiligenceReview(): StandardFormDraft {
  return defineForm({
    code: "DUE_DILIGENCE_RISK",
    name: "Due Diligence and Risk Form",
    description: "Captures verification findings, risk ratings and mitigations.",
    instructions: "Record verified findings and rate each configured risk category.",
    sections: [
      {
        key: "VERIFICATION",
        title: "Verification",
        fields: [
          { key: "ENTITY_VERIFICATION_RESULTS", label: "Entity verification results", type: "TEXTAREA", required: true, columnSpan: 2 },
          { key: "GOVERNANCE_VERIFICATION_RESULTS", label: "Governance verification results", type: "TEXTAREA", required: true, columnSpan: 2 },
          { key: "CAPACITY_ASSESSMENT", label: "Capacity assessment", type: "TEXTAREA", required: true, columnSpan: 2 },
          { key: "COMPLIANCE_SCREENING_RESULTS", label: "Compliance screening results", type: "TEXTAREA", required: true, columnSpan: 2 },
          { key: "DEBARMENT_SCREENING_RESULTS", label: "Debarment screening results", type: "TEXTAREA", required: true, columnSpan: 2 },
        ],
      },
      {
        key: "RISK_RATINGS",
        title: "Risk ratings",
        fields: [
          { key: "FINANCIAL_RISK_RATING", label: "Financial risk rating", type: "SINGLE_SELECT", required: true, options: riskOptions },
          { key: "DELIVERY_RISK_RATING", label: "Delivery risk rating", type: "SINGLE_SELECT", required: true, options: riskOptions },
          { key: "GOVERNANCE_RISK_RATING", label: "Governance risk rating", type: "SINGLE_SELECT", required: true, options: riskOptions },
          { key: "FRAUD_RISK_RATING", label: "Fraud risk rating", type: "SINGLE_SELECT", required: true, options: riskOptions },
          { key: "OVERALL_RISK_RATING", label: "Overall risk rating", type: "SINGLE_SELECT", required: true, options: riskOptions },
        ],
      },
      {
        key: "MITIGATION",
        title: "Mitigation",
        fields: [
          { key: "RISK_MITIGATION_MEASURES", label: "Risk mitigation measures", type: "TEXTAREA", required: true, columnSpan: 2 },
          { key: "ADDITIONAL_VERIFICATION_REQUIRED", label: "Is additional verification required?", type: "YES_NO", required: true },
          { key: "ADDITIONAL_VERIFICATION_DETAILS", label: "Additional verification details", type: "TEXTAREA", required: true, columnSpan: 2, visibilityCondition: equals("ADDITIONAL_VERIFICATION_REQUIRED", true) },
        ],
      },
    ],
  });
}

function moderationReview(): StandardFormDraft {
  return defineForm({
    code: "MODERATION",
    name: "Moderation Form",
    description: "Captures justified moderation adjustments and provisional allocation.",
    instructions: "Use the consolidated score and rank supplied in the workflow context.",
    sections: [{
      key: "MODERATION",
      title: "Moderation",
      fields: [
        { key: "SCORE_ADJUSTED", label: "Was the consolidated score adjusted?", type: "YES_NO", required: true },
        { key: "SCORE_ADJUSTMENT", label: "Score adjustment", type: "NUMBER", required: true, visibilityCondition: equals("SCORE_ADJUSTED", true) },
        { key: "ADJUSTMENT_JUSTIFICATION", label: "Adjustment justification", type: "TEXTAREA", required: true, columnSpan: 2, visibilityCondition: equals("SCORE_ADJUSTED", true) },
        { key: "PROVISIONAL_ALLOCATION", label: "Provisional allocation", type: "CURRENCY", minimum: 0 },
        { key: "MODERATION_COMMENTS", label: "Moderation comments", type: "TEXTAREA", columnSpan: 2 },
      ],
    }],
  });
}

function committeeReview(): StandardFormDraft {
  return defineForm({
    code: "COMMITTEE_REVIEW",
    name: "Committee Review Form",
    description: "Captures the application-level committee record.",
    instructions: "Record the committee resolution after quorum and conflict checks are complete.",
    sections: [{
      key: "COMMITTEE_RECORD",
      title: "Committee record",
      fields: [
        { key: "AGENDA_ITEM", label: "Agenda item", type: "TEXT", required: true },
        { key: "RESOLUTION_NUMBER", label: "Resolution number", type: "TEXT", required: true },
        { key: "RECOMMENDED_AMOUNT", label: "Recommended amount", type: "CURRENCY", minimum: 0 },
        { key: "AWARD_CONDITIONS", label: "Award conditions", type: "TEXTAREA", columnSpan: 2 },
        { key: "DISSENTING_VIEWS", label: "Dissenting views", type: "TEXTAREA", columnSpan: 2 },
        { key: "COMMITTEE_COMMENTS", label: "Committee comments", type: "TEXTAREA", columnSpan: 2 },
      ],
    }],
  });
}

function approvalReview(): StandardFormDraft {
  return defineForm({
    code: "APPROVAL",
    name: "Approval Form",
    description: "Captures the approved award details and funding allocation.",
    instructions: "Confirm the amount and funding details before recording the workflow decision.",
    sections: [{
      key: "AWARD_DETAILS",
      title: "Award details",
      fields: [
        { key: "APPROVED_AMOUNT", label: "Approved amount", type: "CURRENCY", required: true, minimum: 0 },
        { key: "FUNDING_SOURCE", label: "Funding source", type: "TEXT", required: true },
        { key: "COST_CENTRE", label: "Cost centre", type: "TEXT", required: true },
        { key: "CONDITIONS_PRECEDENT", label: "Conditions precedent", type: "TEXTAREA", columnSpan: 2 },
        { key: "APPROVAL_COMMENTS", label: "Approval comments", type: "TEXTAREA", columnSpan: 2 },
      ],
    }],
  });
}

function appealSubmission(): StandardFormDraft {
  return defineForm({
    code: "APPEAL_SUBMISSION",
    name: "Appeal Submission Form",
    description: "Captures an applicant's grounds and details for an appeal.",
    instructions: "Explain the process grounds for the appeal. Supporting evidence is uploaded separately.",
    submitLabel: "Submit appeal",
    sections: [{
      key: "APPEAL",
      title: "Appeal",
      fields: [
        { key: "APPEAL_GROUNDS", label: "Appeal grounds", type: "TEXTAREA", required: true, columnSpan: 2 },
        { key: "APPEAL_DETAILS", label: "Appeal details", type: "TEXTAREA", required: true, columnSpan: 2 },
      ],
    }],
  });
}

function appealReview(): StandardFormDraft {
  return defineForm({
    code: "APPEAL_REVIEW",
    name: "Appeal Review Form",
    description: "Captures the process-compliance review and rationale for an appeal.",
    instructions: "Review process compliance rather than re-adjudicating application merit.",
    sections: [{
      key: "APPEAL_REVIEW",
      title: "Appeal review",
      fields: [
        { key: "PROCESS_COMPLIANCE_FINDINGS", label: "Process compliance findings", type: "TEXTAREA", required: true, columnSpan: 2 },
        { key: "APPEAL_RATIONALE", label: "Appeal rationale", type: "TEXTAREA", required: true, columnSpan: 2 },
        { key: "RECOMMENDED_REMEDY", label: "Recommended remedy", type: "TEXTAREA", columnSpan: 2 },
      ],
    }],
  });
}

function trancheClaim(): StandardFormDraft {
  return defineForm({
    code: "TRANCHE_CLAIM",
    name: "Tranche Claim Form",
    description: "Captures one payment claim for one disbursement tranche.",
    instructions: "Provide the claim values for this tranche. Supporting evidence is uploaded separately.",
    submitLabel: "Submit claim",
    sections: [{
      key: "CLAIM_DETAILS",
      title: "Claim details",
      fields: [
        { key: "TRANCHE_NUMBER", label: "Tranche number", type: "NUMBER", required: true, minimum: 1 },
        { key: "CLAIM_AMOUNT", label: "Claim amount", type: "CURRENCY", required: true, minimum: 0 },
        { key: "MILESTONE_REFERENCE", label: "Milestone reference", type: "TEXT", required: true },
        { key: "EXPENDITURE_TO_DATE", label: "Expenditure to date", type: "CURRENCY", required: true, minimum: 0 },
        { key: "HAS_EXPENDITURE_VARIANCE", label: "Is there an expenditure variance?", type: "YES_NO", required: true },
        { key: "EXPENDITURE_VARIANCE", label: "Expenditure variance", type: "CURRENCY", required: true, visibilityCondition: equals("HAS_EXPENDITURE_VARIANCE", true) },
        { key: "VARIANCE_EXPLANATION", label: "Variance explanation", type: "TEXTAREA", required: true, columnSpan: 2, visibilityCondition: equals("HAS_EXPENDITURE_VARIANCE", true) },
      ],
    }],
  });
}

function disbursementReview(): StandardFormDraft {
  return defineForm({
    code: "DISBURSEMENT_REVIEW",
    name: "Disbursement Review Form",
    description: "Captures financial acquittal and payment-condition verification.",
    instructions: "Verify the claim, prior reporting obligations and payment conditions.",
    sections: [{
      key: "FINANCIAL_ACQUITTAL",
      title: "Financial acquittal",
      fields: [
        { key: "PRIOR_EXPENDITURE_VERIFIED", label: "Has prior expenditure been verified?", type: "YES_NO", required: true },
        { key: "PRIOR_REPORTS_ACQUITTED", label: "Have prior reports been acquitted?", type: "YES_NO", required: true },
        { key: "PAYMENT_CONDITIONS_MET", label: "Have payment conditions been met?", type: "YES_NO", required: true },
        { key: "AMOUNT_RECOMMENDED_FOR_PAYMENT", label: "Amount recommended for payment", type: "CURRENCY", required: true, minimum: 0 },
        { key: "REVIEW_COMMENTS", label: "Review comments", type: "TEXTAREA", columnSpan: 2 },
      ],
    }],
  });
}

function monitoringReview(): StandardFormDraft {
  return defineForm({
    code: "MONITORING_REVIEW",
    name: "Monitoring Review Form",
    description: "Captures performance, data-quality and compliance review findings.",
    instructions: "Assess the submitted reporting period after reviewing its evidence.",
    sections: [{
      key: "PERFORMANCE_ASSESSMENT",
      title: "Performance assessment",
      fields: [
        { key: "PERFORMANCE_RATING", label: "Performance rating", type: "SINGLE_SELECT", required: true, options: ["On track", "At risk", "Off track"] },
        { key: "DATA_QUALITY_RATING", label: "Data quality rating", type: "SINGLE_SELECT", required: true, options: ["Verified", "Partially verified", "Not verified"] },
        { key: "COMPLIANCE_RATING", label: "Compliance rating", type: "SINGLE_SELECT", required: true, options: ["Compliant", "Partially compliant", "Non-compliant"] },
        { key: "REVIEW_FINDINGS", label: "Review findings", type: "TEXTAREA", required: true, columnSpan: 2 },
        { key: "CORRECTIVE_ACTION_REQUIRED", label: "Is corrective action required?", type: "YES_NO", required: true },
        { key: "CORRECTIVE_ACTION_DETAILS", label: "Corrective action details", type: "TEXTAREA", required: true, columnSpan: 2, visibilityCondition: equals("CORRECTIVE_ACTION_REQUIRED", true) },
      ],
    }],
  });
}

function evaluationCloseOutReview(): StandardFormDraft {
  return defineForm({
    code: "EVALUATION_CLOSE_OUT_REVIEW",
    name: "Evaluation and Close-out Review Form",
    description: "Captures evaluation findings, management response and close-out assurance.",
    instructions: "Complete the evaluation and close-out assessment after reviewing final reports and audit evidence.",
    sections: [{
      key: "EVALUATION",
      title: "Evaluation",
      fields: [
        { key: "EVALUATOR_FINDINGS", label: "Evaluator findings", type: "TEXTAREA", required: true, columnSpan: 2 },
        { key: "MANAGEMENT_RESPONSE", label: "Management response", type: "TEXTAREA", columnSpan: 2 },
        { key: "GRANTEE_PERFORMANCE_RATING", label: "Grantee performance rating", type: "NUMBER", required: true, minimum: 1, maximum: 5 },
        { key: "AUDIT_SIGN_OFF_CONFIRMED", label: "Has audit sign-off been confirmed?", type: "YES_NO", required: true },
        { key: "CLOSE_OUT_COMMENTS", label: "Close-out comments", type: "TEXTAREA", columnSpan: 2 },
      ],
    }],
  });
}

export function createStandardFormDrafts(): StandardFormDraft[] {
  return [
    technicalReview(),
    dueDiligenceReview(),
    moderationReview(),
    committeeReview(),
    approvalReview(),
    appealSubmission(),
    appealReview(),
    trancheClaim(),
    disbursementReview(),
    monitoringReview(),
    evaluationCloseOutReview(),
  ];
}
