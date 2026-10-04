"use client";

import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type {
  WorkflowRfiDeadlineSettings,
  WorkflowRfiRuntimeOverrides,
} from "../../domain/actions/WorkflowRequestInformationDeadline";

type Props = {
  configureOverrides?: boolean;
  expiryAction?: WorkflowRfiDeadlineSettings["expiryAction"];
  runtimeOverrides?: WorkflowRfiRuntimeOverrides;
};

export function WorkflowRfiDeadlineFields({
  configureOverrides = false,
  expiryAction = "CLOSE_REQUEST",
  runtimeOverrides,
}: Props) {
  const expiryItems = [{ label: "Close request", value: "CLOSE_REQUEST" }];
  const legacyExpiryItems =
    expiryAction === "CLOSE_REQUEST"
      ? expiryItems
      : [
          ...expiryItems,
          {
            disabled: true,
            label:
              expiryAction === "RETURN"
                ? "Return (configured)"
                : "Escalate (configured)",
            value: expiryAction,
          },
        ];

  return (
    <>
      <div className="space-y-3">
        <FormInput
          disabled={runtimeOverrides ? !runtimeOverrides.deadlineDays : false}
          label="Response deadline (days)"
          max={365}
          min={1}
          name="deadlineDays"
          registrationOptions={{ valueAsNumber: true }}
          required
          type="number"
        />
        {configureOverrides ? (
          <CheckboxField
            label="Allow response deadline override at runtime"
            name="runtimeOverrides.deadlineDays"
          />
        ) : null}
      </div>
      <div className="space-y-3">
        <FormSelect
          disabled={runtimeOverrides ? !runtimeOverrides.expiryAction : false}
          items={legacyExpiryItems}
          label="On expiry"
          name="expiryAction"
          required
        />
        {configureOverrides ? (
          <CheckboxField
            label="Allow on expiry override at runtime"
            name="runtimeOverrides.expiryAction"
          />
        ) : null}
      </div>
      <div className="space-y-3 sm:col-span-2">
        <FormInput
          disabled={
            runtimeOverrides ? !runtimeOverrides.reminderDayOffsets : false
          }
          infoTooltip="Comma-separated days after the request. Every reminder must occur before the response deadline. Leave blank for no reminders."
          label="Reminder day offsets"
          name="reminderDayOffsets"
          placeholder="3, 7"
        />
        {configureOverrides ? (
          <CheckboxField
            label="Allow reminder day offsets override at runtime"
            name="runtimeOverrides.reminderDayOffsets"
          />
        ) : null}
      </div>
    </>
  );
}
