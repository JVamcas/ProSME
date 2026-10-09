import { randomUUID } from "node:crypto";
import type pg from "pg";
import { versionOwnerId } from "./FundingCallVersionDatabaseFixture";

export async function completeVersionApplication(
  pool: pg.Pool,
  applicationId: string,
  formVersionId: string,
) {
  const businessId = randomUUID();
  const sectionId = randomUUID();
  await pool.query(
    `INSERT INTO app_business_profiles
    (id, user_id, legal_name, trading_name, registration_number, business_type, sector,
      region, physical_address, established_year, employee_count)
    VALUES ($1, $2, 'Synthetic business', 'Synthetic trading', 'SYN-001', 'cc', 'services',
      'Khomas', 'Synthetic address', 2024, 3)`,
    [businessId, versionOwnerId],
  );
  await pool.query(
    `INSERT INTO app_form_sections
    (id, form_version_id, key, title, display_order)
    VALUES ($1, $2, 'DECLARATIONS_AND_CONSENT', 'Declarations and consent', 1)`,
    [sectionId, formVersionId],
  );
  await pool.query(
    `INSERT INTO app_form_fields
    (form_version_id, section_id, key, label, type, required, display_order)
    VALUES
      ($1, $2, 'DECLARATION_ACCURACY_CONFIRMATION', 'Accuracy', 'TEXT', true, 1),
      ($1, $2, 'DECLARATION_AUTHORITY_CONFIRMATION', 'Authority', 'TEXT', true, 2),
      ($1, $2, 'DATA_PROCESSING_CONSENT', 'Data processing', 'TEXT', true, 3),
      ($1, $2, 'VERIFICATION_CONSENT', 'Verification', 'TEXT', true, 4)`,
    [formVersionId, sectionId],
  );
  await pool.query(
    "UPDATE app_applications SET business_id = $2, row_version = row_version + 1 WHERE id = $1",
    [applicationId, businessId],
  );
  await pool.query(
    `UPDATE app_application_draft_responses SET values = $2
    WHERE application_id = $1`,
    [
      applicationId,
      {
        DECLARATION_ACCURACY_CONFIRMATION: "CONFIRMED",
        DECLARATION_AUTHORITY_CONFIRMATION: "CONFIRMED",
        DATA_PROCESSING_CONSENT: "CONSENT_GRANTED",
        VERIFICATION_CONSENT: "CONSENT_GRANTED",
      },
    ],
  );
}
