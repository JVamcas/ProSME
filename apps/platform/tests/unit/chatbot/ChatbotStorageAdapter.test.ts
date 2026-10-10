import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fakes = vi.hoisted(() => ({
  save: vi.fn(),
  getMetadata: vi.fn(),
  read: vi.fn(),
  file: vi.fn(),
  bucket: vi.fn(),
}));
vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket = fakes.bucket;
  },
}));
vi.mock("@/integrations/storage/GoogleCloudStorageOptions", () => ({
  getGoogleCloudStorageOptions: () => ({}),
}));
import { createChatbotArtifactStorage } from "@/modules/chatbot/infrastructure/ChatbotArtifactStorage";
import { chatbotKnowledgeObjectKeys } from "@/modules/chatbot/infrastructure/ChatbotKnowledgeStorageContract";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
beforeEach(() => {
  vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "knowledge-fixture-bucket");
  vi.clearAllMocks();
  fakes.bucket.mockReturnValue({ file: fakes.file });
  fakes.file.mockReturnValue({
    save: fakes.save,
    getMetadata: fakes.getMetadata,
    createReadStream: fakes.read,
  });
  fakes.getMetadata.mockResolvedValue([{ generation: "17", size: "8" }]);
  fakes.read.mockImplementation(() => Readable.from([Buffer.from("approved")]));
  fakes.save.mockResolvedValue(undefined);
});
describe("release-scoped GCS knowledge adapter", () => {
  it.each([
    {
      override: "knowledge-fixture-bucket",
      expected: "knowledge-fixture-bucket",
    },
    { override: "", expected: "application-fixture-bucket" },
    { override: undefined, expected: "application-fixture-bucket" },
    {
      override: "application-fixture-bucket",
      expected: "application-fixture-bucket",
    },
  ])(
    "uses configured bucket %# with conditional writes and verified pinned downloads",
    async ({ override, expected }) => {
      vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", override);
      vi.stubEnv("GCS_DOCUMENTS_BUCKET", "application-fixture-bucket");
      const keys = chatbotKnowledgeObjectKeys(chatbotId(80));
      const storage = createChatbotArtifactStorage(chatbotId(80));
      const saved = await storage.putOnce(
        keys.knowledge,
        Buffer.from("approved"),
      );
      expect(saved.generation).toBe("17");
      expect(fakes.bucket).toHaveBeenCalledWith(expected);
      expect(fakes.save.mock.calls[0][1]).toMatchObject({
        preconditionOpts: { ifGenerationMatch: 0 },
        validation: "crc32c",
        metadata: { cacheControl: "private, no-store" },
      });
      expect(fakes.file).toHaveBeenCalledWith(keys.knowledge, {
        generation: "17",
      });
      expect(fakes.read).toHaveBeenCalledWith({ validation: "crc32c" });
    },
  );
  it("adopts an existing identical object after a conditional-write conflict", async () => {
    fakes.save.mockRejectedValue({ code: 412 });
    await expect(
      createChatbotArtifactStorage(chatbotId(80)).putOnce(
        chatbotKnowledgeObjectKeys(chatbotId(80)).knowledge,
        Buffer.from("approved"),
      ),
    ).resolves.toHaveProperty("generation", "17");
  });
  it("rejects an invalid explicit override and requires one configured bucket", () => {
    vi.stubEnv("GCS_DOCUMENTS_BUCKET", "application-fixture-bucket");
    vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "gs://invalid-bucket");
    expect(() => createChatbotArtifactStorage(chatbotId(80))).toThrow();
    vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "");
    vi.stubEnv("GCS_DOCUMENTS_BUCKET", undefined);
    expect(() => createChatbotArtifactStorage(chatbotId(80))).toThrow();
  });
  it("blocks corrupt or oversized reads and foreign object keys", async () => {
    const keys = chatbotKnowledgeObjectKeys(chatbotId(80));
    const storage = createChatbotArtifactStorage(chatbotId(80));
    fakes.read.mockImplementation(() =>
      Readable.from([Buffer.from("tampered")]),
    );
    await expect(
      storage.putOnce(keys.knowledge, Buffer.from("approved")),
    ).rejects.toThrow("checksum");
    fakes.getMetadata.mockResolvedValue([
      { generation: "17", size: String(6 * 1024 * 1024) },
    ]);
    await expect(storage.read(keys.knowledge)).rejects.toThrow("limit");
    await expect(storage.read("private/applicant.json")).rejects.toThrow("key");
  });
});
