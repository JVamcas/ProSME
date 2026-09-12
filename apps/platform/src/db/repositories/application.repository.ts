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
