export const notificationRecipientTypes = [
  "APPLICATION_OWNER",
  "ASSIGNED_USER",
  "FUNDING_CALL_STAKEHOLDER",
  "SPECIFIC_USER",
  "SPECIFIC_ROLE",
] as const;

export type NotificationRecipientType =
  (typeof notificationRecipientTypes)[number];

export type RelationshipNotificationRecipientType = Extract<
  NotificationRecipientType,
  "APPLICATION_OWNER" | "ASSIGNED_USER" | "FUNDING_CALL_STAKEHOLDER"
>;

const relationshipRecipientTypes = [
  "APPLICATION_OWNER",
  "ASSIGNED_USER",
  "FUNDING_CALL_STAKEHOLDER",
] as const satisfies readonly RelationshipNotificationRecipientType[];

export function isRelationshipNotificationRecipientType(
  value: NotificationRecipientType,
): value is RelationshipNotificationRecipientType {
  return relationshipRecipientTypes.some((type) => type === value);
}

export function relationshipRecipientTypesForEvent(
  eventKey: string,
): readonly RelationshipNotificationRecipientType[] {
  if (eventKey === "application.submitted") {
    return ["APPLICATION_OWNER"];
  }
  return relationshipRecipientTypes;
}
