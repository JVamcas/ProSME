"use client";

import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import type { WorkflowActionType } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type { WorkflowAssignmentOptions } from "@/modules/workflows/domain/definitions/WorkflowTypes";

type Props = {
  actionType: WorkflowActionType;
  assignmentOptions: WorkflowAssignmentOptions;
  deferTargetType: "DATE" | "FUNDING_CALL";
  escalationTargetType: "ROLE" | "USER";
  hideRejectionOutcomeSelector?: boolean;
  rejectionOutcomeType: "TERMINAL" | "TRANSITION";
};

function KeyListField({
  label,
  name,
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <FormTextarea
      containerClassName="sm:col-span-2"
      infoTooltip="Use uppercase stable keys separated by commas or new lines."
      label={label}
      name={name}
      placeholder={placeholder}
      required={required}
      rows={2}
    />
  );
}

function RequestInformationFields() {
  return (
    <>
      <FormInput
        label="Response deadline (days)"
        max={365}
        min={1}
        name="deadlineDays"
        registrationOptions={{ valueAsNumber: true }}
        required
        type="number"
      />
      <FormSelect
        items={[
          { label: "Close request", value: "CLOSE_REQUEST" },
          { label: "Escalate", value: "ESCALATE" },
          { label: "Return", value: "RETURN" },
        ]}
        label="On expiry"
        name="expiryAction"
        required
      />
      <FormTextarea
        containerClassName="sm:col-span-2"
        infoTooltip="Use stable field paths separated by commas or new lines, for example application.financial.turnover."
        label="Editable field paths"
        name="editableFieldPaths"
        placeholder="application.financial.turnover"
        required
        rows={2}
      />
      <FormInput
        containerClassName="sm:col-span-2"
        infoTooltip="Comma-separated days after the request. Every reminder must occur before the response deadline."
        label="Reminder day offsets"
        name="reminderDayOffsets"
        placeholder="3, 7"
      />
    </>
  );
}

function EscalationFields({
  assignmentOptions,
  targetType,
}: {
  assignmentOptions: WorkflowAssignmentOptions;
  targetType: "ROLE" | "USER";
}) {
  const targets =
    targetType === "ROLE" ? assignmentOptions.roles : assignmentOptions.users;
  return (
    <>
      <FormSelect
        items={[
          { label: "Role", value: "ROLE" },
          { label: "Named user", value: "USER" },
        ]}
        label="Escalate to"
        name="escalationTargetType"
        required
      />
      <FormSelect
        items={targets.map((item) => ({
          label: item.label,
          value: item.id,
        }))}
        label={targetType === "ROLE" ? "Target role" : "Target user"}
        name="escalationTargetId"
        placeholder="Select a target"
        required
      />
      <FormSelect
        containerClassName="sm:col-span-2"
        items={[
          { label: "Manual", value: "MANUAL" },
          { label: "SLA breach", value: "SLA_BREACH" },
          { label: "Condition", value: "CONDITION" },
        ]}
        label="Escalation trigger"
        name="escalationTrigger"
        required
      />
      <FormSelect
        items={[
          { label: "Retain current responsibility", value: "RETAIN" },
          { label: "Share responsibility", value: "SHARE" },
          { label: "Transfer responsibility", value: "TRANSFER" },
        ]}
        label="Responsibility"
        name="escalationResponsibility"
        required
      />
      <CheckboxField
        label="Block current assignees until resolved"
        name="escalationBlocksWork"
      />
    </>
  );
}

function DeferFields({ targetType }: { targetType: "DATE" | "FUNDING_CALL" }) {
  return (
    <>
      <FormSelect
        items={[
          { label: "Target date", value: "DATE" },
          { label: "Funding call", value: "FUNDING_CALL" },
        ]}
        label="Defer until"
        name="deferTargetType"
        required
      />
      {targetType === "DATE" ? (
        <FormInput label="Target date" name="targetDate" required type="date" />
      ) : (
        <FormInput
          label="Target funding call key"
          name="targetCallKey"
          placeholder="SME_FUND_2027"
          required
        />
      )}
    </>
  );
}

function ActionConfigurationFields({
  actionType,
  assignmentOptions,
  deferTargetType,
  escalationTargetType,
  hideRejectionOutcomeSelector = false,
  rejectionOutcomeType,
}: Props) {
  switch (actionType) {
    case "APPROVE_ADVANCE":
      return null;
    case "REJECT":
      return (
        <>
          <FormInput
            label="Reversal action key"
            name="reversibleActionKey"
            placeholder="REOPEN_REJECTION"
          />
          {hideRejectionOutcomeSelector ? null : (
            <FormSelect
              containerClassName="sm:col-span-2"
              items={[
                { label: "Terminal rejection", value: "TERMINAL" },
                { label: "Follow configured transition", value: "TRANSITION" },
              ]}
              label="Rejection outcome"
              name="rejectionOutcomeType"
              required
            />
          )}
          {rejectionOutcomeType === "TERMINAL" ? (
            <>
              <CheckboxField
                label="Cancel all open tasks"
                name="cancelOpenTasks"
              />
              <CheckboxField
                label="Cancel all open stages"
                name="cancelOpenStageInstances"
              />
              <FormSelect
                items={[
                  { label: "Outcome available", value: "OUTCOME_AVAILABLE" },
                  { label: "Closed", value: "CLOSED" },
                ]}
                label="Applicant status"
                name="rejectionPublicStatus"
                required
              />
              <FormInput
                label="Applicant status label"
                name="rejectionPublicLabel"
                required
              />
              <FormTextarea
                containerClassName="sm:col-span-2"
                label="Applicant status description"
                name="rejectionPublicDescription"
                required
                rows={2}
              />
            </>
          ) : null}
        </>
      );
    case "REQUEST_INFORMATION":
      return <RequestInformationFields />;
    case "RETURN":
      return (
        <>
          <FormSelect
            items={[
              { label: "Retain existing data", value: "RETAIN" },
              { label: "Clear existing data", value: "CLEAR" },
            ]}
            label="Returned data"
            name="dataHandling"
            required
          />
          <CheckboxField
            containerClassName="sm:col-span-2"
            label="Require a return reason"
            name="reasonRequired"
          />
        </>
      );
    case "REFER":
      return (
        <>
          <FormSelect
            items={[
              { label: "Block until referral completes", value: "BLOCKED" },
              { label: "Keep open during referral", value: "OPEN" },
            ]}
            label="Referring task behavior"
            name="sourceTaskBehavior"
            required
          />
          <CheckboxField
            label="Return to the referrer after completion"
            name="returnToReferrer"
          />
        </>
      );
    case "ESCALATE":
      return (
        <EscalationFields
          assignmentOptions={assignmentOptions}
          targetType={escalationTargetType}
        />
      );
    case "PUT_ON_HOLD":
      return (
        <>
          <KeyListField
            label="Hold reason codes"
            name="reasonCodes"
            placeholder="AWAITING_EXTERNAL_DECISION"
          />
          <CheckboxField
            containerClassName="sm:col-span-2"
            label="Require a review date"
            name="reviewDateRequired"
          />
        </>
      );
    case "RESUME":
      return null;
    case "WITHDRAW":
      return (
        <>
          <KeyListField
            label="Allowed stage keys"
            name="allowedStageKeys"
            placeholder="SUBMITTED, UNDER_REVIEW"
          />
          <FormSelect
            containerClassName="sm:col-span-2"
            items={[
              { label: "Resubmission not allowed", value: "NOT_ALLOWED" },
              { label: "Create a new application", value: "NEW_APPLICATION" },
              {
                label: "Reopen withdrawn application",
                value: "REOPEN_WITHDRAWN",
              },
            ]}
            label="Resubmission rule"
            name="resubmissionRule"
            required
          />
        </>
      );
    case "DEFER":
      return <DeferFields targetType={deferTargetType} />;
  }
}

export function WorkflowActionConfigurationFields(props: Props) {
  const fields = ActionConfigurationFields(props);

  if (fields === null) {
    return null;
  }

  return (
    <>
      <div className="sm:col-span-2 border-t border-brand-navy/10 pt-4">
        <h3 className="text-sm font-bold text-brand-navy">
          Action-specific configuration
        </h3>
      </div>
      {fields}
    </>
  );
}
