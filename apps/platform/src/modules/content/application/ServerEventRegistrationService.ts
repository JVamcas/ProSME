import { reconcileEventEmailIntents } from "@/modules/notifications/infrastructure/EventEmailDeliveryRepository";
import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  RequestValidationError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { captureEventRegistrationIntents } from "@/modules/notifications/infrastructure/EventNotificationIntentRepository";
import {
  eventIdSchema,
  eventParticipantQuerySchema,
  eventRegistrationSchema,
  eventRegistrationSettingsSchema,
} from "../api/EventRegistrationSchemas";
import { isEventRegistrationOpen } from "../domain/EventRegistrationPolicy";
import type { EventRegistrationReceipt } from "../domain/EventRegistration";
import * as repository from "../infrastructure/EventRegistrationRepository";

export async function registerForEvent(
  id: unknown,
  values: unknown,
): Promise<EventRegistrationReceipt> {
  const eventId = eventIdSchema.parse(id);
  const input = eventRegistrationSchema.parse(values);
  return repository.eventRegistrationTransaction(async (transaction) => {
    const event = await repository.readRegistrationEvent(transaction, eventId);
    if (!event) throw new ResourceNotFoundError("published event");
    const settings = await repository.readRegistrationSettings(
      transaction,
      eventId,
    );
    if (!isEventRegistrationOpen(event, settings, new Date())) {
      throw new RequestValidationError(
        "Registration is closed for this event.",
      );
    }
    const registration = await repository.insertEventParticipant(
      transaction,
      eventId,
      input,
    );
    if (registration) {
      await repository.auditEventRegistration(
        transaction,
        eventId,
        registration.id,
        "REGISTERED",
        null,
      );
      await captureEventRegistrationIntents(
        transaction,
        registration.id,
        event,
        settings!,
      );
    }
    // Replays return the same generic acknowledgement, without revealing an
    // existing participant's identity, receipt ID, or registration timestamp.
    return { accepted: true };
  });
}

export async function getEventRegistrationSettings(
  user: AuthenticatedUser | null,
  id: unknown,
) {
  requirePermission(user, permissionCodes.eventRegistrationSettingsReadAll);
  const eventId = eventIdSchema.parse(id);
  return repository.eventRegistrationTransaction(async (transaction) => {
    const event = await repository.readRegistrationEvent(
      transaction,
      eventId,
      false,
    );
    if (!event) throw new ResourceNotFoundError("event");
    return {
      event,
      settings: await repository.readRegistrationSettings(transaction, eventId),
    };
  });
}

export async function updateEventRegistrationSettings(
  user: AuthenticatedUser | null,
  id: unknown,
  values: unknown,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eventRegistrationSettingsUpdateAll,
  );
  const eventId = eventIdSchema.parse(id);
  const input = eventRegistrationSettingsSchema.parse(values);
  return repository.eventRegistrationTransaction(async (transaction) => {
    const event = await repository.readRegistrationEvent(
      transaction,
      eventId,
      false,
    );
    if (!event) throw new ResourceNotFoundError("event");
    await repository.saveRegistrationSettings(
      transaction,
      eventId,
      input,
      actor.id,
    );
    await reconcileEventEmailIntents(transaction, eventId);
    await repository.auditEventRegistration(
      transaction,
      eventId,
      null,
      "SETTINGS_UPDATED",
      actor.id,
      input,
    );
    return { eventId };
  });
}

export async function getEventParticipants(
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
  return repository.eventRegistrationTransaction(async (transaction) => {
    const event = await repository.readRegistrationEvent(
      transaction,
      eventId,
      false,
    );
    if (!event) throw new ResourceNotFoundError("event");
    await repository.auditEventRegistration(
      transaction,
      eventId,
      null,
      "PARTICIPANTS_READ",
      actor.id,
    );
    return repository.listEventParticipants(transaction, eventId, query);
  });
}
