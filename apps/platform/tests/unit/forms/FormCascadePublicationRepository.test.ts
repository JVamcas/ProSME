import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseTransaction } from "@/platform/database/client";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormFieldWriteRepository", () => ({
  readPublicationFields: vi.fn(),
}));
vi.mock("@/modules/forms/FormDefinitionValidation", () => ({
  formPublicationErrors: vi.fn(),
}));
import { readPublicationFields } from "@/modules/forms/infrastructure/FormFieldWriteRepository";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";
import { publishAttachedFormVersions } from "@/modules/forms/infrastructure/FormCascadePublicationRepository";

const draft = {
  id: "draft",
  name: "Review",
  status: "DRAFT",
  active: true,
  submitLabel: "Submit",
};
function database(versions = [draft]) {
  const query = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    for: vi.fn().mockResolvedValue(versions),
  };
  const sections = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const update = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const db = {
    select: vi.fn().mockReturnValueOnce(query).mockReturnValue(sections),
    execute: vi.fn(),
    update: vi.fn().mockReturnValue(update),
  };
  return {
    ...db,
    transaction: db as unknown as DatabaseTransaction,
    updateQuery: update,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readPublicationFields).mockResolvedValue([]);
  vi.mocked(formPublicationErrors).mockReturnValue([]);
});

describe("attached form publication", () => {
  it("deduplicates exact versions and batches validation reads and writes", async () => {
    const db = database([
      draft,
      { ...draft, id: "second" },
      { ...draft, id: "published", status: "PUBLISHED" },
    ]);
    const authorize = vi.fn();
    await publishAttachedFormVersions(
      db.transaction,
      ["draft", "second", "draft", "published"],
      "actor",
      authorize,
    );
    expect(authorize).toHaveBeenCalledOnce();
    expect(readPublicationFields).toHaveBeenCalledExactlyOnceWith(
      db.transaction,
      ["draft", "second"],
    );
    expect(formPublicationErrors).toHaveBeenCalledTimes(2);
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(db.update).toHaveBeenCalledOnce();
    expect(db.execute).toHaveBeenCalledOnce();
    expect(db.updateQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PUBLISHED", publishedBy: "actor" }),
    );
  });

  it("does not write or require form publication permission for already published forms", async () => {
    const db = database([{ ...draft, status: "PUBLISHED" }]);
    const authorize = vi.fn();
    await publishAttachedFormVersions(
      db.transaction,
      ["draft"],
      "actor",
      authorize,
    );
    expect(authorize).not.toHaveBeenCalled();
    expect(readPublicationFields).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", []],
    ["retired", [{ ...draft, status: "RETIRED" }]],
    ["inactive", [{ ...draft, active: false }]],
  ])("rejects %s forms before writes", async (_label, versions) => {
    const db = database(versions);
    await expect(
      publishAttachedFormVersions(db.transaction, ["draft"], "actor", vi.fn()),
    ).rejects.toThrow();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("checks permission before loading draft contents", async () => {
    const db = database();
    await expect(
      publishAttachedFormVersions(db.transaction, ["draft"], "actor", () => {
        throw new Error("Denied");
      }),
    ).rejects.toThrow("Denied");
    expect(readPublicationFields).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("validates every draft before writing any publication", async () => {
    const db = database([
      draft,
      { ...draft, id: "second", name: "Application" },
    ]);
    vi.mocked(formPublicationErrors)
      .mockReturnValueOnce([])
      .mockReturnValueOnce(["Add a field."]);
    await expect(
      publishAttachedFormVersions(
        db.transaction,
        ["draft", "second"],
        "actor",
        vi.fn(),
      ),
    ).rejects.toThrow("Cannot publish form “Application”: Add a field.");
    expect(db.execute).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
