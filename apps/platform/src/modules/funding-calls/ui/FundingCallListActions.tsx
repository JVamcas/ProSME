"use client";

import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";
import type { FundingCallView } from "../api/FundingCallTransport";
import { FundingCallExceptionalActions } from "./FundingCallExceptionalActions";

export type FundingCallListActionOptions = {
  canClone: boolean;
  canDelete: boolean;
  canWithdrawForAmendment: boolean;
  canEnablePublicInteraction: boolean;
  canDisablePublicInteraction: boolean;
  cloningId?: string;
  deletingId?: string;
  changingInteractionId?: string;
  onClone: (call: FundingCallView) => void;
  onDelete: (call: FundingCallView) => void;
  onToggleInteraction: (call: FundingCallView) => void;
};

export function FundingCallListActions({
  call,
  ...options
}: FundingCallListActionOptions & { call: FundingCallView }) {
  const enabled = call.publicInteractionEnabled !== false;
  const canToggle = enabled
    ? options.canDisablePublicInteraction
    : options.canEnablePublicInteraction;
  const items: ActionMenuItem[] = [
    {
      id: "clone",
      label: "Clone",
      disabled: !options.canClone || options.cloningId === call.id,
      onAction: () => options.onClone(call),
    },
    ...(canToggle
      ? [
          {
            id: "public-interaction",
            label: enabled
              ? "Disable public interaction"
              : "Enable public interaction",
            disabled: options.changingInteractionId === call.id,
            onAction: () => options.onToggleInteraction(call),
          },
        ]
      : []),
    {
      id: "delete",
      label: "Delete",
      destructive: true,
      disabled: !options.canDelete || options.deletingId === call.id,
      onAction: () => options.onDelete(call),
    },
  ];

  return (
    <FundingCallExceptionalActions
      call={call}
      canArchive={false}
      canResume={false}
      canSuspend={false}
      canWithdraw={false}
      canWithdrawForAmendment={options.canWithdrawForAmendment}
      renderActions={(exceptional) => (
        <ActionMenu
          label={`Funding call actions for ${call.title}`}
          items={[...items, ...exceptional]}
        />
      )}
    />
  );
}
