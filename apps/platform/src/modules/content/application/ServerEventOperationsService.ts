import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import {
  requirePermission,
  requireAnyPermission,
} from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  eventIdSchema,
  eventParticipantQuerySchema,
} from "../api/EventRegistrationSchemas";
import type { EventOperationsOverview } from "../api/EventOperationsTypes";
import * as operations from "../infrastructure/EventOperationsRepository";
import * as registration from "../infrastructure/EventRegistrationRepository";

export function eventOperationsPermissions(user: AuthenticatedUser | null) {
  const granted = new Set(user?.capabilities ?? []);
  return {
    participants: granted.has(permissionCodes.eventRegistrationsReadAll),
    settings: granted.has(permissionCodes.eventRegistrationSettingsReadAll),
    update: granted.has(permissionCodes.eventRegistrationSettingsUpdateAll),
    delivery: granted.has(permissionCodes.eventEmailDeliveryReadAll),
  };
}

function requireEventAccess(user: AuthenticatedUser | null) {
  const permissions = eventOperationsPermissions(user);
  requireAnyPermission(user, [
    permissionCodes.eventRegistrationsReadAll,
    permissionCodes.eventRegistrationSettingsReadAll,
    permissionCodes.eventEmailDeliveryReadAll,
  ]);
  return permissions;
}

export async function getEventOperationsOverview(
  user: AuthenticatedUser | null,
  id: unknown,
): Promise<EventOperationsOverview> {
  const permissions = requireEventAccess(user);
  const eventId = eventIdSchema.parse(id);
  return registration.eventRegistrationTransaction(async (transaction) => {
    const event = await registration.readRegistrationEvent(
      transaction,
      eventId,
      false,
    );
    if (!event) throw new ResourceNotFoundError("event");
    const [settings, counts] = await Promise.all([
      permissions.settings
        ? registration.readRegistrationSettings(transaction, eventId)
        : Promise.resolve(null),
      permissions.participants || permissions.delivery
        ? operations.readEventOperationsCounts(eventId, permissions)
        : Promise.resolve(null),
    ]);
    return {
      event,
      settings,
      permissions,
      registered: permissions.participants ? counts!.registered : null,
      confirmationsSent: permissions.delivery
        ? counts!.confirmationsSent
        : null,
      remindersScheduled: permissions.delivery
        ? counts!.remindersScheduled
        : null,
      deliveryIssues: permissions.delivery ? counts!.deliveryIssues : null,
    };
  });
}

export async function getEventOperationsParticipants(
  user: AuthenticatedUser | null,
  id: unknown,
  values: unknown,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eventRegistrationsReadAll,
  );
  const eventId = eventIdSchema.parse(id);
  const query = eventParticipantQuerySchema.parse(values);
  return registration.eventRegistrationTransaction(async (transaction) => {
    const event = await registration.readRegistrationEvent(
      transaction,
      eventId,
      false,
    );
    if (!event) throw new ResourceNotFoundError("event");
    await registration.auditEventRegistration(
      transaction,
      eventId,
      null,
      "PARTICIPANTS_READ",
      actor.id,
    );
    return operations.readEventParticipantStatuses(
      eventId,
      query,
      eventOperationsPermissions(user).delivery,
    );
  });
}

export async function getEventOperationsDelivery(
  user: AuthenticatedUser | null,
  id: unknown,
  values: unknown,
) {
  requirePermission(user, permissionCodes.eventEmailDeliveryReadAll);
  const eventId = eventIdSchema.parse(id);
  const query = eventParticipantQuerySchema.parse(values);
  return registration.eventRegistrationTransaction(async (transaction) => {
    const event = await registration.readRegistrationEvent(
      transaction,
      eventId,
      false,
    );
    if (!event) throw new ResourceNotFoundError("event");
    return operations.readEventDeliveryPage(eventId, query);
  });
}

export async function getOperationsEventPage(
  user: AuthenticatedUser | null,
  values: unknown,
) {
  requireEventAccess(user);
  const query = eventParticipantQuerySchema.parse(values);
  return operations.readOperationsEventPage(query.page);
}
