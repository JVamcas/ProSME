import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applicantProfiles,
  profileAuditEntries,
  users,
} from "@/db/schema";
import type { ApplicantProfileUpdateInput } from "@/modules/profiles/ProfileSchemas";

const applicantColumns = {
  firstName: applicantProfiles.firstName,
  surname: applicantProfiles.surname,
  position: applicantProfiles.position,
  phoneNumber: applicantProfiles.phoneNumber,
  dateOfBirth: applicantProfiles.dateOfBirth,
  nationality: applicantProfiles.nationality,
  region: applicantProfiles.region,
  postalAddress: applicantProfiles.postalAddress,
  email: users.email,
  updatedAt: applicantProfiles.updatedAt,
};

type ApplicantProfileRow = {
  firstName: string;
  surname: string;
  position: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  nationality: string;
  region: string;
  postalAddress: string;
  email: string;
  updatedAt: Date;
};

export async function findApplicantProfile(
  ownerUserId: string,
): Promise<ApplicantProfileRow | null> {
  const [row] = await getDatabase()
    .select(applicantColumns)
    .from(applicantProfiles)
    .innerJoin(users, eq(users.id, applicantProfiles.userId))
    .where(
      and(
        eq(applicantProfiles.userId, ownerUserId),
        eq(users.id, ownerUserId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function saveApplicantProfile(
  ownerUserId: string,
  input: ApplicantProfileUpdateInput,
) {
  const values =
    input.section === "personal"
      ? {
          ...input.data,
          dateOfBirth: input.data.dateOfBirth || null,
        }
      : input.data;

  return getDatabase().transaction(async (transaction) => {
    const [profile] = await transaction
      .insert(applicantProfiles)
      .values({
        userId: ownerUserId,
        ...values,
      })
      .onConflictDoUpdate({
        target: applicantProfiles.userId,
        set: {
          ...values,
          updatedAt: new Date(),
        },
      })
      .returning({ id: applicantProfiles.id });

    await transaction.insert(profileAuditEntries).values({
      actorUserId: ownerUserId,
      entityType: "applicant_profile",
      entityId: profile.id,
      action: `profile.${input.section}.updated`,
      changes: { fields: Object.keys(input.data) },
    });
  });
}
