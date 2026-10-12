export const chatbotDocumentLimits = {
  fileBytes: 5 * 1024 * 1024,
  textCharacters: 200000,
  selectedDocuments: 100,
  pdfPages: 100,
  chunkCharacters: 8000,
} as const;

export const chatbotDocumentAccept = ".pdf,.docx,.txt";

export type ChatbotDocumentPreview = {
  id: string;
  name: string;
  fileName: string;
  text: string;
  active: boolean;
};

export type ChatbotDocumentKnowledge = {
  id: string;
  name: string;
  text: string;
  contentHash: string;
};
