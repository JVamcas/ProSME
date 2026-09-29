import {
  notificationErrorCodes,
  NotificationValidationError,
} from "./NotificationErrors";

export type NotificationRecipientRequirement = {
  candidateUserIds: readonly string[];
  eventDisplayName: string;
  eventKey: string;
  recipientId: string;
  recipientTargetLabel: string;
  recipientType: string;
  required: boolean;
};

function recipientDescription(requirement: NotificationRecipientRequirement) {
  if (requirement.recipientType === "SPECIFIC_ROLE") {
    return `role \"${requirement.recipientTargetLabel}\"`;
  }
  if (requirement.recipientType === "SPECIFIC_USER") {
    return `user \"${requirement.recipientTargetLabel}\"`;
  }
  return `recipient \"${requirement.recipientTargetLabel}\"`;
}

export function assertRequiredNotificationRecipients(
  requirements: readonly NotificationRecipientRequirement[],
  excludedRecipientUserIds: ReadonlySet<string>,
) {
  const groupedRequirements = new Map<
    string,
    NotificationRecipientRequirement[]
  >();
  for (const requirement of requirements) {
    const group = groupedRequirements.get(requirement.recipientId) ?? [];
    group.push(requirement);
    groupedRequirements.set(requirement.recipientId, group);
  }

  for (const group of groupedRequirements.values()) {
    const requirement = group[0]!;
    if (!requirement.required) continue;

    const candidateUserIds = new Set(
      group.flatMap((item) => item.candidateUserIds),
    );
    if (
      [...candidateUserIds].some(
        (userId) => !excludedRecipientUserIds.has(userId),
      )
    ) {
      continue;
    }

    const target = recipientDescription(requirement);
    const reason = candidateUserIds.size > 0
      ? `All active users assigned to ${target} are excluded from this notification, usually because they submitted or edited the record.`
      : `No active user is assigned to the required ${target}.`;
    throw new NotificationValidationError(
      notificationErrorCodes.invalidRecipient,
      `Notification \"${requirement.eventDisplayName}\" (${requirement.eventKey}) cannot be sent. ${reason} Assign another eligible user or update the notification rule.`,
    );
  }
}
