import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  findApplicantProfile,
  saveApplicantProfile,
} from "@/db/repositories/ProfileRepository";
import {
  createOwnedBusiness,
  listOwnedBusinesses,
} from "@/db/repositories/BusinessRepository";
import {
  findUserByFirebaseSubject,
  provisionApplicant,
} from "@/db/repositories/UserRepository";

const { Pool } = pg;
const enabled = process.env.RUN_P3_PROFILE_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;

const firstUserId = "11111111-1111-4111-8111-111111111111";
const secondUserId = "22222222-2222-4222-8222-222222222222";
const firebaseSubject = "p31-integration-firebase-subject";

const applicantInput = {
  firstName: "Anna",
  surname: "Ndeitunga",
  position: "Managing director",
  phoneNumber: "+264810000000",
  dateOfBirth: "1990-01-01",
  nationality: "Namibian",
  region: "Khomas",
  postalAddress: "Private Bag 1",
};

const businessInput = {
  legalName: "Rollback Trading CC",
  tradingName: "Rollback Trading",
  registrationNumber: "CC/2026/ROLLBACK",
  businessType: "Close corporation",
  sector: "Retail",
  region: "Khomas",
  physicalAddress: "1 Independence Avenue",
  establishedYear: "2020",
  employeeCount: "4",
};

const pool = enabled
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : null;

async function query(text: string, values: unknown[] = []) {
  if (!pool) {
    throw new Error("The P3.1 PostgreSQL test pool is not configured.");
  }

  return pool.query(text, values);
}

beforeAll(async () => {
  if (!enabled) {
    return;
  }

  await query(
    `INSERT INTO app_users
      (id, email, display_name, user_type, status)
     VALUES
      ($1, 'anna@example.test', 'Anna Ndeitunga', 'applicant', 'active'),
      ($2, 'other@example.test', 'Other Applicant', 'applicant', 'active')`,
    [firstUserId, secondUserId],
  );
  await query(
    `INSERT INTO app_user_identities
      (user_id, provider, subject, email_verified)
     VALUES ($1, 'firebase', $2, true)`,
    [firstUserId, firebaseSubject],
  );
  await query(
    `INSERT INTO app_user_roles (user_id, role_id)
     SELECT $1, id
     FROM app_roles
     WHERE code = 'applicant'`,
    [firstUserId],
  );
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("P3.1 PostgreSQL persistence", () => {
  it("has the migration tables, ownership indexes and immutable trigger", async () => {
    const result = await query(
      `SELECT
        to_regclass('app_applicant_profiles') AS applicant_table,
        to_regclass('app_business_profiles') AS business_table,
        to_regclass('app_applicant_profiles_user_unique') AS applicant_index,
        to_regclass('app_business_profiles_user_idx') AS business_index,
        EXISTS (
          SELECT 1
          FROM pg_trigger
          WHERE tgname = 'app_profile_audit_immutable'
            AND NOT tgisinternal
        ) AS immutable_trigger`,
    );

    expect(result.rows[0]).toEqual({
      applicant_table: "app_applicant_profiles",
      business_table: "app_business_profiles",
      applicant_index: "app_applicant_profiles_user_unique",
      business_index: "app_business_profiles_user_idx",
      immutable_trigger: true,
    });
  });

  it("allows an applicant to own multiple businesses", async () => {
    await createOwnedBusiness(firstUserId, businessInput);
    await createOwnedBusiness(firstUserId, {
      ...businessInput,
      legalName: "Second Trading CC",
      registrationNumber: "CC/2026/SECOND",
    });

    const businesses = await listOwnedBusinesses(firstUserId);
    const otherBusinesses = await listOwnedBusinesses(secondUserId);

    expect(businesses).toHaveLength(2);
    expect(otherBusinesses).toHaveLength(0);
  });

  it("executes the named user projection with roles and capabilities", async () => {
    const user = await findUserByFirebaseSubject(firebaseSubject);

    expect(user).toMatchObject({
      id: firstUserId,
      email: "anna@example.test",
      displayName: "Anna Ndeitunga",
      status: "active",
    });
    expect(user?.roleCodes).toContain("applicant");
    expect(user?.capabilities).toContain("profile.read.own");
    expect(user?.capabilities).not.toContain("application.read.own");

    const refreshed = await provisionApplicant({
      subject: firebaseSubject,
      email: "anna@example.test",
      displayName: "Anna Ndeitunga",
      emailVerified: true,
    });

    expect(refreshed.lastLoginAt).toBeInstanceOf(Date);
  });

  it("enforces owner-scoped reads and creates an immutable audit entry", async () => {
    await saveApplicantProfile(firstUserId, {
      section: "personal",
      data: {
        firstName: applicantInput.firstName,
        surname: applicantInput.surname,
        position: applicantInput.position,
        dateOfBirth: applicantInput.dateOfBirth,
        nationality: applicantInput.nationality,
        region: applicantInput.region,
      },
    });
    const personalOnly = await findApplicantProfile(firstUserId);
    expect(personalOnly?.phoneNumber).toBe("");
    expect(personalOnly?.region).toBe(applicantInput.region);

    await saveApplicantProfile(firstUserId, {
      section: "contact",
      data: {
        phoneNumber: applicantInput.phoneNumber,
        postalAddress: applicantInput.postalAddress,
      },
    });

    const ownedProfile = await findApplicantProfile(firstUserId);
    const otherProfile = await findApplicantProfile(secondUserId);
    const audit = await query(
      `SELECT id, action
       FROM app_profile_audit_entries
       WHERE actor_user_id = $1
         AND entity_type = 'applicant_profile'`,
      [firstUserId],
    );

    expect(ownedProfile).toMatchObject({
      firstName: applicantInput.firstName,
      email: "anna@example.test",
    });
    expect(otherProfile).toBeNull();
    expect(audit.rows).toHaveLength(2);
    expect(audit.rows.map((row) => row.action).sort()).toEqual([
      "profile.contact.updated",
      "profile.personal.updated",
    ]);

    await expect(
      query(
        `UPDATE app_profile_audit_entries
         SET action = 'tampered'
         WHERE id = $1`,
        [audit.rows[0].id],
      ),
    ).rejects.toThrow("profile audit entries are immutable");
  });

  it("rolls back a profile write when its audit insert fails", async () => {
    await query(
      `ALTER TABLE app_profile_audit_entries
       ADD CONSTRAINT test_reject_business_audit
       CHECK (action <> 'business.created') NOT VALID`,
    );

    await expect(
      createOwnedBusiness(secondUserId, businessInput),
    ).rejects.toThrow();

    const result = await query(
      `SELECT count(*)::integer AS count
       FROM app_business_profiles
       WHERE user_id = $1`,
      [secondUserId],
    );

    expect(result.rows[0].count).toBe(0);
  });
});
