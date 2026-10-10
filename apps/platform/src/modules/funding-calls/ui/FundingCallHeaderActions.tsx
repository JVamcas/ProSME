"use client";

import { toast } from "sonner";
import {
  DropdownButton,
  type DropdownButtonItem,
} from "@/shared/ui/DropdownButton";
import type { FundingCallView } from "../api/FundingCallTransport";
import { usePrepareFundingCallReplacement } from "../FundingCallHooks";
import type { FundingCallActionPermissions } from "./FundingCallActionTypes";
import { FundingCallExceptionalActions } from "./FundingCallExceptionalActions";
import { FundingCallGovernanceActions } from "./FundingCallGovernanceActions";
import { FundingCallPageActions } from "./FundingCallPageActions";

export function FundingCallHeaderActions({
  call,
  ...permissions
}: FundingCallActionPermissions & { call: FundingCallView }) {
  const prepare = usePrepareFundingCallReplacement(call.id);
  const editItems: DropdownButtonItem[] = [];
  if (
    permissions.canUpdate &&
    call.currentPublishedVersionId &&
    !call.draftVersionId &&
    ["LIVE", "SCHEDULED", "SUSPENDED", "CLOSED"].includes(call.status)
  ) {
    editItems.push({
      id: "edit",
      label: "Edit",
      disabled: prepare.isPending,
      onAction: () =>
        prepare.mutate(
          {
            expectedRowVersion: call.rowVersion,
            sourceVersionId:
              call.viewedPublishedVersionId ?? call.currentPublishedVersionId!,
          },
          {
            onError: (error) => toast.error(error.message),
          },
        ),
    });
  }

  function renderMenu(items: DropdownButtonItem[]) {
    if (!items.length) return null;
    return (
      <DropdownButton
        ariaLabel={`Funding call actions for ${call.title}`}
        items={items}
        label="Actions"
      />
    );
  }

  function renderExceptional(
    publication: DropdownButtonItem[],
    governance: DropdownButtonItem[],
  ) {
    return (
      <FundingCallExceptionalActions
        {...permissions}
        call={{ ...call, status: call.effectiveStatus ?? call.status }}
        renderActions={(operational) =>
          renderMenu([
            ...editItems,
            ...publication,
            ...governance,
            ...operational,
          ])
        }
      />
    );
  }

  function renderGovernance(publication: DropdownButtonItem[]) {
    return (
      <FundingCallGovernanceActions
        {...permissions}
        call={call}
        renderActions={(governance) =>
          renderExceptional(publication, governance)
        }
      />
    );
  }

  return (
    <FundingCallPageActions
      canPublish={permissions.canPublish}
      id={call.id}
      renderActions={renderGovernance}
    />
  );
}
