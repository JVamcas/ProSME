import type { WorkflowPublicStatusMapping } from "../definitions/WorkflowStageDefinition";

export type ApproveAdvanceConfiguration = Record<string, never>;

export type RejectConfiguration = {
  commentRequired: boolean;
  outcome:
    | {
        cancelOpenStageInstances: boolean;
        cancelOpenTasks: boolean;
        publicStatusMapping: WorkflowPublicStatusMapping;
        type: "TERMINAL";
      }
    | { type: "TRANSITION" };
  reasonCodes: string[];
  reversibleActionKey: string | null;
};

export type RequestInformationConfiguration = {
  deadlineDays: number;
  editableFieldKeys: string[];
  reminderDayOffsets: number[];
  expiryAction: "CLOSE_REQUEST" | "ESCALATE" | "RETURN";
};

export type ReturnConfiguration = {
  dataHandling: "RETAIN" | "CLEAR";
  reasonRequired: boolean;
};

export type ReferConfiguration = {
  returnToReferrer: boolean;
};

export type EscalateConfiguration = {
  targetType: "ROLE" | "USER";
  targetId: string;
  trigger: "MANUAL" | "SLA_BREACH" | "CONDITION";
};

export type PutOnHoldConfiguration = {
  reasonCodes: string[];
  reviewDateRequired: boolean;
};

export type WithdrawConfiguration = {
  allowedStageKeys: string[];
  resubmissionRule: "NOT_ALLOWED" | "NEW_APPLICATION" | "REOPEN_WITHDRAWN";
};

export type DeferConfiguration =
  | {
      targetType: "DATE";
      targetDate: string;
    }
  | {
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
  WITHDRAW: WithdrawConfiguration;
  DEFER: DeferConfiguration;
};

export type WorkflowActionConfiguration =
  WorkflowActionConfigurationByType[keyof WorkflowActionConfigurationByType];
