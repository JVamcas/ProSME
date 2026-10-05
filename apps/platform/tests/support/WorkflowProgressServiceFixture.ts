import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { WorkflowProgressRecord } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";
import type { readWorkflowCompletionProgress } from "@/modules/workflows/infrastructure/WorkflowCompletionProgressRepository";

export function workflowProgressServiceFixture(actorId: string) {
  const task = {
    actionedAt: null,
    assignedRoleCode: "programme_officer",
    assignedRoleName: "Programme Officer",
    assignedUserEmail: "staff@example.test",
    assignedUserId: actorId,
    taskDefinitionId: "definition-one",
    reviewerCount: 3,
    reviewRelease: "STAGE_COMPLETED" as const,
    thresholdSatisfied: false,
    prerequisitesComplete: true,
    assignedUserName: "Staff member",
    dueAt: null,
    id: "task-one",
    name: "Review application",
    required: true,
    status: "PENDING",
    taskType: "CONTRIBUTING" as const,
    viewPermission: permissionCodes.workflowTaskAssignedRead,
  };
  const record: WorkflowProgressRecord = {
    completedAt: null,
    id: "workflow-one",
    name: "SME Fund workflow",
    stages: [
      {
        activatedAt: "2026-09-20T08:00:00.000Z",
        completedAt: null,
        description: "Review",
        id: "stage-one",
        iterationNumber: 1,
        name: "Review",
        sequence: 1,
        stableKey: "review",
        status: "ACTIVE",
        tasks: [
          task,
          { ...task, assignedUserId: "another-user", id: "task-two" },
          {
            ...task,
            assignedUserEmail: null,
            assignedUserId: null,
            assignedUserName: null,
            id: "task-three",
          },
        ],
      },
    ],
    startedAt: "2026-09-20T08:00:00.000Z",
    status: "ACTIVE",
    terminalOutcome: null,
    versionNumber: 1,
    versionId: "bound-version",
  };

  const completion: NonNullable<
    Awaited<ReturnType<typeof readWorkflowCompletionProgress>>
  > = {
    targets: [
      {
        application: { score: 64 },
        eligibility: {},
        fundingCall: {},
        completedAt: null,
        stageInstanceId: "stage-one",
        stageDefinitionId: "stage-definition",
        stageKey: "review",
        status: "ACTIVE",
        workflowInstanceId: "workflow-one",
        workflowVersionId: "bound-version",
        exitCondition: {
          id: "exit",
          kind: "GROUP",
          combinator: "AND",
          children: [
            {
              id: "score",
              kind: "CONDITION",
              operator: basicOperators.EQUALS,
              leftOperand: { kind: "FIELD", key: "application.score" },
              rightOperand: { kind: "CONSTANT", value: 70 },
            },
          ],
        },
      },
    ],
    requirements: [
      {
        stageInstanceId: "stage-one",
        taskDefinitionId: "definition-one",
        taskKey: "review",
        denominator: 3,
        completedCount: 0,
        completedTaskIds: [],
        completionMode: "ALL",
        completionPercentage: null,
        requiredCompletionCount: 3,
      },
    ],
    values: [],
    priorStages: [],
  };
  return { task, record, completion };
}
