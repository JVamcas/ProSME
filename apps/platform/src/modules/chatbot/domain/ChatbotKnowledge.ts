export type KnowledgeSourceKind =
  "funding-call" | "eligibility" | "faq" | "contact";

export type KnowledgeSelection = {
  fundingCallIds: string[];
  faqIds: string[];
  contact?: boolean;
  eligibilityCallIds?: string[];
};

export type KnowledgeSource = {
  kind: KnowledgeSourceKind;
  id: string;
  revision: string;
  fingerprint: string;
  url: string;
  label: string;
};

export type KnowledgeRecord = {
  id: string;
  kind: "funding-call" | "eligibility-criterion" | "faq" | "contact";
  title: string;
  source: KnowledgeSource;
  scope: { fundingCallId: string; rulesetVersionId: string | null } | null;
  facts: Record<string, string | boolean | null>;
  text: string;
};

export type KnowledgeIssue = {
  recordId: string;
  code:
    | "MISSING_SOURCE"
    | "MISSING_DATA"
    | "UNSUPPORTED_CONDITION"
    | "PRIVATE_DEPENDENCY"
    | "CONFLICTING_GUIDANCE";
  message: string;
};

export type PreparedKnowledge = {
  schemaVersion: 1;
  selection: KnowledgeSelection;
  sources: KnowledgeSource[];
  records: KnowledgeRecord[];
  issues: KnowledgeIssue[];
};

export type KnowledgeRelease = {
  id: string;
  status: "PREPARED" | "APPROVED";
  contentHash: string;
  snapshot: PreparedKnowledge;
  preparedAt: string;
  approvedAt: string | null;
  withdrawn?: boolean;
};

export type KnowledgeSourceOption = {
  id: string;
  label: string;
  revision: string;
};

export type KnowledgeSourcePage = {
  items: KnowledgeSourceOption[];
  nextCursor: string | null;
};

export type KnowledgeChange = {
  kind: "added" | "changed" | "removed";
  before: KnowledgeRecord | null;
  after: KnowledgeRecord | null;
};

export type KnowledgeWorkspace = {
  releases: Omit<KnowledgeRelease, "snapshot">[];
  activeReleaseId: string | null;
  epoch: string;
};
