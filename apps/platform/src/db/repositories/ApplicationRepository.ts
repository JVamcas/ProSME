import "server-only";

import {
  adminApplications,
  getAdminApplication,
} from "@/data/admin-applications";

export async function findAllApplications() {
  return adminApplications;
}

export async function findApplicationById(id: string) {
  return getAdminApplication(id) ?? null;
}

export async function findApplicationsAssignedTo(userId: string) {
  void userId;
  return [];
}

export async function findAssignedApplicationById(
  userId: string,
  applicationId: string,
) {
  void userId;
  void applicationId;
  return null;
}
