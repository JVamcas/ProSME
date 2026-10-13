import { drizzle } from "drizzle-orm/pg-proxy";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readFormFields } from "@/modules/forms/infrastructure/FormRepository";
import {
  readPublicationFields,
  replaceDraftContent,
} from "@/modules/forms/infrastructure/FormFieldWriteRepository";
import type { FormField } from "@/modules/forms/FormTypes";

const versionId = "10000000-0000-4000-8000-000000000001";
const field: FormField = {
  id: "20000000-0000-4000-8000-000000000001",
  sectionId: "30000000-0000-4000-8000-000000000001",
  columnSpan: 1,
  key: "BUSINESS_PROFILE",
  label: "Business Profile",
  type: "DOCUMENT",
  required: true,
  order: 1,
  acceptedExtensions: [".pdf"],
  maxPages: 12,
  maximumFileSizeMb: 4,
  uploadedBy: "ANY",
};

describe("document limit repository projections", () => {
  it("writes document limits with the draft field", async () => {
    const execute = vi.fn(async () => ({ rows: [] }));
    const database = drizzle(execute);
    await replaceDraftContent(database as never, versionId, [field], []);
    const insert = execute.mock.calls.find((call) =>
      (call as unknown as [string])[0].startsWith(
        'insert into "app_form_fields"',
      ),
    ) as unknown as [string, unknown[]];
    expect(insert[0]).toContain('"accepted_extensions"');
    expect(insert[1]).toContain('{".pdf"}');
    expect(insert[0]).toContain('"max_pages", "maximum_file_size_mb"');
    expect(insert[1]).toContain(12);
    expect(insert[1]).toContain(4);
    expect(insert[0]).toContain('"uploaded_by"');
    expect(insert[1]).toContain("ANY");
  });

  it.each(["runtime", "publication"])(
    "preserves limits in the %s read",
    async (mode) => {
      const execute = vi.fn(async (query: string) => ({
        rows: query.includes('from "app_form_fields"')
          ? [
              [
                1,
                null,
                field.id,
                field.key,
                field.label,
                null,
                [".pdf"],
                12,
                4,
                "ANY",
                null,
                null,
                null,
                null,
                1,
                true,
                field.sectionId,
                "DOCUMENT",
                null,
                null,
              ],
            ]
          : [],
      }));
      const database = drizzle(execute);
      vi.mocked(getDatabase).mockReturnValue(database as never);
      const result =
        mode === "runtime"
          ? await readFormFields(versionId)
          : await readPublicationFields(database as never, versionId);
      expect(result).toMatchObject([
        {
          key: "BUSINESS_PROFILE",
          acceptedExtensions: [".pdf"],
          maxPages: 12,
          maximumFileSizeMb: 4,
          uploadedBy: "ANY",
        },
      ]);
      const query = execute.mock.calls[0][0];
      expect(query).toContain('"max_pages"');
      expect(query).toContain('"maximum_file_size_mb"');
    },
  );
});
