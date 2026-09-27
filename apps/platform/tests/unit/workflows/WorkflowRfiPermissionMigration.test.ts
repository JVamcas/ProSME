import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0114_rfi_permission_grants.sql"),
  "utf8",
);

describe("RFI permission grant migration", () => {
  it("grants owner RFI access from existing application ownership", () => {
    expect(migration).toContain("funding.application.own.read");
    expect(migration).toContain(
      "funding.application.information-request.own.read",
    );
    expect(migration).toContain(
      "funding.application.information-request.own.respond",
    );
  });

  it("grants assigned RFI operations from task processing access", () => {
    expect(migration).toContain("workflow.task.assigned.process");
    expect(migration).toContain(
      "funding.application.information-request.create",
    );
    expect(migration).toContain(
      "funding.application.information-request.assigned.close",
    );
  });

  it("keeps grants repeatable", () => {
    expect(migration.match(/ON CONFLICT/g)).toHaveLength(3);
  });
});
