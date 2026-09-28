import type { WorkflowPublicStatusMapping } from "../definitions/WorkflowStageDefinition";

export type ApproveAdvanceConfiguration = Record<string, never>;

export type RejectConfiguration = {
  outcome:
    | {
        cancelOpenStageInstances: boolean;
        cancelOpenTasks: boolean;
        publicStatusMapping: WorkflowPublicStatusMapping;
        type: "TERMINAL";
      }
    | { type: "TRANSITION" };
  reversibleActionKey: string | null;
};

export type RequestInformationConfiguration = {
  continuation: "RESUME_SOURCE_TASK";
  deadlineDays: number;
  editableFieldPaths: string[];
  reminderDayOffsets: number[];
  expiryAction: "CLOSE_REQUEST" | "ESCALATE" | "RETURN";
  participantScope: "APPLICATION_OWNER_AND_REQUESTER";
  recipientScope: "APPLICATION_OWNER";
};

export type ReturnConfiguration = {
  dataHandling: "RETAIN" | "CLEAR";
  reasonRequired: boolean;
};

export type ReferConfiguration = {
  returnToReferrer: boolean;
  sourceTaskBehavior: "BLOCKED" | "OPEN";
};

export type EscalateConfiguration = {
  blockUntilResolved: boolean;
  responsibility: "RETAIN" | "SHARE" | "TRANSFER";
  targetType: "ROLE" | "USER";
  targetId: string;
  trigger: "MANUAL" | "SLA_BREACH" | "CONDITION";
};

export type PutOnHoldConfiguration = {
  reasonCodes: string[];
  reviewDateRequired: boolean;
  scope: "STAGE";
};

export type ResumeConfiguration = {
  scope: "STAGE";
};

export type WithdrawConfiguration = {
  allowedStageKeys: string[];
  resubmissionRule: "NOT_ALLOWED" | "NEW_APPLICATION" | "REOPEN_WITHDRAWN";
};

export type DeferConfiguration =
  | {
      continuation: "RESUME_ON_DATE";
      targetType: "DATE";
      targetDate: string;
    }
  | {
      continuation: "EXPLICIT_TRANSFER";
      targetType: "FUNDING_CALL";
      targetCallKey: string;
    };

export type WorkflowActionConfigurationByType = {
  APPROVE_ADVANCE: ApproveAdvanceConfiguration;
  REJECT: RejectConfiguration;
  REQUEST_INFORMATION: RequestInformationConfiguration;
  RETURN: ReturnConfiguration;
  REFER: ReferConfiguration;
  ESCALATE: EscalateConfiguration;
  PUT_ON_HOLD: PutOnHoldConfiguration;
  RESUME: ResumeConfiguration;
  WITHDRAW: WithdrawConfiguration;
  DEFER: DeferConfiguration;
};

export type WorkflowActionConfiguration =
  WorkflowActionConfigurationByType[keyof WorkflowActionConfigurationByType];
