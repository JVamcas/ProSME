export type FormSearchContent = {
  definitionId?: string;
  versionNumber?: number;
  versionId: string;
  name: string;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      helpText: string;
      options: string[];
      details?: string[];
    }>;
  }>;
};
