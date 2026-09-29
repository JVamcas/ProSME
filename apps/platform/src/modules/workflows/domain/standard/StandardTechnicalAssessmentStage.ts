import type { WorkflowStageInput } from "../definitions/WorkflowTypes";
import { stableKeyFromLabel } from "../WorkflowStableKey";
import {
  action,
  approve,
  documentRequirement,
  requestInformation,
  stage,
  task,
} from "./StandardWorkflowBuilders";
import type { StandardWorkflowDependencies } from "./StandardWorkflowTypes";

const option = (code: string, label: string) => ({ code, label });

export function createStandardTechnicalAssessmentStage(
  dependencies: StandardWorkflowDependencies,
): WorkflowStageInput {
  const actions = [
    approve("RECOMMEND", "Recommend", 1),
    approve("RECOMMEND_WITH_CONDITIONS", "Recommend with conditions", 2),
    approve("DO_NOT_RECOMMEND", "Do not recommend", 3),
    requestInformation("REQUEST_CLARIFICATION", "Request clarification", 4),
    action(
      "ESCALATE_SCORING_DISCREPANCY",
      "Escalate scoring discrepancy",
      "ESCALATE",
      5,
      {
        blockUntilResolved: true,
        responsibility: "SHARE",
        targetId: dependencies.roleIds.panel_moderator,
        targetType: "ROLE",
        trigger: "MANUAL",
      },
    ),
  ];
  const criteria = [
    {
      commentRequired: true,
      code: "TECHNICAL_MERIT",
      label: "Technical merit and feasibility",
      maximumScore: 10,
      weight: 40,
    },
    {
      commentRequired: true,
      code: "EXPECTED_IMPACT",
      label: "Expected impact",
      maximumScore: 10,
      weight: 35,
    },
    {
      commentRequired: true,
      code: "DELIVERY_CAPACITY",
      label: "Delivery capacity",
      maximumScore: 10,
      weight: 25,
    },
  ];
  return stage({
    actions,
    checklistItems: [],
    coiGated: true,
    coiFormVersionId: dependencies.formVersionIds.COI_DECLARATION ?? null,
    description: "Perform independent technical or scientific assessment.",
    displayOrder: 2,
    documentRequirements: [
      documentRequirement(
        "COI and confidentiality undertaking",
        "ASSIGNED_REVIEWER",
      ),
      documentRequirement("Individual review report", "ASSIGNED_REVIEWER"),
    ],
    enabled: true,
    initial: false,
    name: "Technical or Scientific Assessment",
    optional: false,
    publicStatusMapping: {
      description: "Your application is undergoing detailed assessment.",
      label: "Detailed assessment",
      status: "UNDER_REVIEW",
    },
    repeatable: true,
    scoring: {
      aggregation: "WEIGHTED_AVERAGE",
      taskStableKey: "TECHNICAL_REVIEW",
      criteria: criteria.map((criterion) => ({
        criterion: criterion.label,
        stableKey: stableKeyFromLabel(criterion.label, "SCORE"),
        description: "Standard baseline; confirm for each Funding Call.",
        mandatoryComment: criterion.commentRequired,
        scaleMaximum: criterion.maximumScore,
        scaleMinimum: 0,
        weight: criterion.weight,
      })),
    },
    slaHours: 240,
    stableKey: "TECHNICAL_ASSESSMENT",
    tasks: [
      task(dependencies, {
        actionKeys: ["REQUEST_CLARIFICATION", "ESCALATE_SCORING_DISCREPANCY"],
        taskType: "CONTRIBUTING",
        config: { criteria },
        description:
          "Score the application and record an independent recommendation.",
        displayOrder: 1,
        formCode: "TECHNICAL_REVIEW",
        name: "Independent technical review",
        requiredCompletionCount: 2,
        reviewerCount: 3,
        roleCode: "sector_specialist",
        stableKey: "TECHNICAL_REVIEW",
      }),
      task(dependencies, {
        actionKeys: [
          "RECOMMEND",
          "RECOMMEND_WITH_CONDITIONS",
          "DO_NOT_RECOMMEND",
        ],
        taskType: "STAGE_DECISION",
        config: {
          outcomes: actions
            .slice(0, 3)
            .map((item) => option(item.stableKey, item.label)),
        },
        description:
          "Determine the stage outcome after the required independent reviews.",
        displayOrder: 2,
        name: "Technical assessment decision",
        roleCode: "panel_moderator",
        stableKey: "TECHNICAL_ASSESSMENT_DECISION",
      }),
    ],
  });
}
