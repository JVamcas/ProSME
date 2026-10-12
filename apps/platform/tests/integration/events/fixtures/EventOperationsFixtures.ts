import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";

export const actorId = "00000000-0000-4000-8000-000000000001";
export function actor(grants: string[], status = "active") {
  return {
    id: actorId,
    status,
    capabilities: new Set(grants),
  } as unknown as AuthenticatedUser;
}
export const staff = actor([
  permissionCodes.eventRegistrationsReadAll,
  permissionCodes.eventRegistrationSettingsReadAll,
  permissionCodes.eventRegistrationSettingsUpdateAll,
  permissionCodes.eventEmailDeliveryReadAll,
]);
export const settings = {
  enabled: true,
  opensAt: null,
  closesAt: null,
  confirmationEnabled: true,
  reminderEnabled: true,
  reminderHours: 24,
};
export const input = {
  fullName: "Synthetic Participant",
  email: "synthetic@example.test",
  organisation: "Test Organisation",
  emailConsent: true,
};
