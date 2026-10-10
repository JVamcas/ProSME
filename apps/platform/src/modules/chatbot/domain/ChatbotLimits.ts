export const chatbotLimits = {
  selectedCalls: 100,
  selectedFaqs: 1000,
  sourcePageSize: 50,
  preparedRecords: 5000,
  passageCharacters: 20000,
  knowledgeBytes: 5 * 1024 * 1024,
  conditionDepth: 12,
  conditionNodes: 200,
  requestBytes: 64 * 1024,
  questionCharacters: 2000,
  contextMessages: 20,
  searchCandidates: 12,
  modelOutputTokens: 512,
  modelInputCharacters: 32000,
  answerCharacters: 20000,
  modelTimeoutMilliseconds: 15000,
  requestsPerMinute: 10,
} as const;

export const chatbotPolicyDefaults = {
  sessionMinutes: 30,
  escalationDays: 90,
  contactDays: 90,
  recipientUserIds: [] as string[],
  unresolvedPolicy: "UPDATE_OPEN_CASE" as const,
};
