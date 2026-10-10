import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const boundary = vi.hoisted(() => ({
  settings: vi.fn(),
  auth: vi.fn(),
  request: vi.fn(),
  provider: vi.fn(),
}));
vi.mock("@/modules/chatbot/infrastructure/ChatbotSettingsRepository", () => ({
  readChatbotRuntimeSettings: boundary.settings,
}));
vi.mock(
  "@/modules/chatbot/infrastructure/ChatbotProviderConfiguration",
  () => ({ chatbotProviderConfiguration: boundary.provider }),
);
vi.mock("@/integrations/storage/GoogleCloudStorageOptions", () => ({
  getGoogleCloudStorageOptions: () => ({}),
}));
vi.mock("google-auth-library", () => ({
  GoogleAuth: class {
    constructor() {
      boundary.auth();
    }
    async getClient() {
      return { request: boundary.request };
    }
  },
}));
import { createVertexChatbotSelector } from "@/modules/chatbot/infrastructure/VertexChatbotPassageSelector";

const input = {
  question: "Required documents",
  context: [],
  candidates: [
    {
      id: "faq:1",
      title: "Documents",
      text: "Bring the public registration form.",
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  boundary.settings.mockResolvedValue({
    publicEnabled: true,
    modelEnabled: true,
    rowVersion: 1,
  });
  boundary.provider.mockReturnValue({
    project: "chatbot-project",
    location: "eu",
    model: "gemini-3.8-flash",
  });
  boundary.request.mockResolvedValue({
    data: {
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  status: "ANSWER",
                  passageIds: ["faq:1"],
                }),
              },
            ],
          },
        },
      ],
    },
  });
});

describe("provider application switches before dispatch", () => {
  it.each([
    { publicEnabled: false, modelEnabled: true },
    { publicEnabled: true, modelEnabled: false },
  ])(
    "never resolves credentials or sends text when disabled %#",
    async (settings) => {
      boundary.settings.mockResolvedValue(settings);
      await expect(createVertexChatbotSelector().select(input)).rejects.toThrow(
        "turned off",
      );
      expect(boundary.provider).not.toHaveBeenCalled();
      expect(boundary.auth).not.toHaveBeenCalled();
      expect(boundary.request).not.toHaveBeenCalled();
    },
  );

  it("checks again after asynchronous credential resolution and blocks a newly disabled model", async () => {
    boundary.settings
      .mockResolvedValueOnce({ publicEnabled: true, modelEnabled: true })
      .mockResolvedValueOnce({ publicEnabled: true, modelEnabled: false });
    await expect(createVertexChatbotSelector().select(input)).rejects.toThrow(
      "turned off",
    );
    expect(boundary.auth).toHaveBeenCalledOnce();
    expect(boundary.request).not.toHaveBeenCalled();
  });

  it("uses enabled database settings and provider configuration without an environment enable switch", async () => {
    vi.stubEnv("CHATBOT_MODEL_ENABLED", "false");
    expect(await createVertexChatbotSelector().select(input)).toEqual({
      status: "ANSWER",
      passageIds: ["faq:1"],
    });
    expect(boundary.settings).toHaveBeenCalledTimes(2);
    expect(boundary.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        retry: false,
        url: "https://eu-aiplatform.googleapis.com/v1/projects/chatbot-project/locations/eu/publishers/google/models/gemini-3.8-flash:generateContent",
      }),
    );
    const sent = boundary.request.mock.calls[0][0].data;
    expect(JSON.parse(sent.contents[0].parts[0].text).candidates).toEqual(
      input.candidates,
    );
    expect(sent).not.toHaveProperty("tools");
  });
});
