import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const capabilityMigration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0001_phase2_cms_authorization.sql"),
  "utf8",
);
const auditMigration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0002_authorization_audit_schema.sql"),
  "utf8",
);
const torRoleMigration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0003_tor_role_catalogue.sql"),
  "utf8",
);
const reviewerCapabilityMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0004_tor_reviewer_site_settings.sql",
  ),
  "utf8",
);
const torRoleNameMigration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0005_tor_cms_role_names.sql"),
  "utf8",
);
const profileCompatibilityMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0007_profile_sections_application_scope.sql",
  ),
  "utf8",
);
const applicantBusinessesMigration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0008_applicant_businesses.sql"),
  "utf8",
);
const bootstrapAdminScript = readFileSync(
  path.resolve(process.cwd(), "../../scripts/seed/bootstrap-admin.ts"),
  "utf8",
);

describe("Phase 2 authorization migration", () => {
  it("adds every CMS resource namespace", () => {
    for (const resource of [
      "pages",
      "news",
      "resources",
      "events",
      "faqs",
      "funding-calls",
      "eligibility",
      "statistics",
      "media",
      "site-settings",
      "engagement-submissions",
    ]) {
      expect(capabilityMigration).toContain(`('${resource}', ARRAY[`);
    }
  });

  it("makes authorization audit records immutable", () => {
    expect(auditMigration).toContain("BEFORE UPDATE OR DELETE");
    expect(auditMigration).toContain("authorization audit entries are immutable");
  });

  it("seeds the TOR role catalogue and migrates legacy assignments", () => {
    for (const roleCode of [
      "cms_administrator",
      "cms_editor",
      "cms_author",
      "cms_reviewer",
      "programme_officer",
      "sector_specialist",
      "approval_panel_member",
    ]) {
      expect(torRoleMigration).toContain(`'${roleCode}'`);
    }

    expect(torRoleMigration).toContain("'role.migrated'");
    expect(torRoleMigration).toContain(
      "finance_officer has assigned users and requires an approved TOR role mapping",
    );
    expect(reviewerCapabilityMigration).toContain(
      "cms.site-settings.update",
    );

    for (const roleName of [
      "Administrator",
      "Editor",
      "Author",
      "Reviewer",
    ]) {
      expect(torRoleNameMigration).toContain(`'${roleName}'`);
    }
  });
});

describe("P3.1 migration compatibility", () => {
  it("adds the position column for databases that applied early 0006", () => {
    expect(profileCompatibilityMigration).toContain(
      'ADD COLUMN IF NOT EXISTS "position"',
    );
  });

  it("bootstraps administrators with additive applicant access", () => {
    expect(bootstrapAdminScript).toContain(
      '["system_administrator", "applicant"]',
    );
    expect(bootstrapAdminScript).not.toContain(".delete(userRoles)");
  });

  it("allows multiple businesses per applicant with an ownership index", () => {
    expect(applicantBusinessesMigration).toContain(
      'DROP INDEX IF EXISTS "app_business_profiles_user_unique"',
    );
    expect(applicantBusinessesMigration).toContain(
      '"app_business_profiles_user_idx"',
    );
  });
});
