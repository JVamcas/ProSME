export type ChatbotRuntimeSettings = {
  publicEnabled: boolean;
  modelEnabled: boolean;
  rowVersion: number;
};

export type ChatbotSettingsView = ChatbotRuntimeSettings & {
  providerReady: boolean;
};
