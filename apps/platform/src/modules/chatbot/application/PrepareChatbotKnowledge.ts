import { sanitizeFundingCallRichText } from "@/modules/funding-calls/infrastructure/FundingCallRichText";
import type { FundingCallKnowledgeProjection } from "@/modules/funding-calls/application/ServerFundingCallKnowledgeService";
import type { FaqKnowledgeProjection } from "@/modules/content/application/ServerFaqKnowledgeService";
import {
  lexicalToKnowledgeText,
  publicKnowledgeUrl,
} from "@/modules/content/domain/LexicalPlainText";
import type { PublicEligibilityKnowledge } from "@/modules/eligibility/application/ServerEligibilityKnowledgeService";
import { publicFundingCallHref } from "@/modules/funding-calls/domain/PublicFundingCallLinks";
import { richTextToPlainText } from "@/shared/utils/RichText";
import { RequestValidationError } from "@/lib/resource-errors";
import type {
  KnowledgeSelection,
  PreparedKnowledge,
  KnowledgeSource,
} from "../domain/ChatbotKnowledge";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";
import { prepareEligibilityKnowledge } from "./PrepareEligibilityKnowledge";
import { approvedKnowledgeDocument } from "../engine/ApprovedKnowledgeDocument";
import type { ContactKnowledgeProjection } from "@/modules/content/application/ServerContactKnowledgeService";
import { prepareContactKnowledge } from "./PrepareContactKnowledge";

function callKnowledge(call: FundingCallKnowledgeProjection) {
  const fields = call.publicFields;
  const plain = (value: string | null) =>
    richTextToPlainText(sanitizeFundingCallRichText(value ?? ""));
  const description = plain(fields.description);
  const eligibility = plain(fields.eligibilitySummary);
  const facts = {
    reference: fields.reference,
    lifecycle: call.status,
    opensAt: fields.opensAt,
    closesAt: fields.closesAt,
    minimumGrantAmount: fields.minimumGrantAmount,
    maximumGrantAmount: fields.maximumGrantAmount,
    totalBudgetEnvelope: fields.totalBudgetEnvelope,
    fundingInstrument: fields.fundingInstrument,
    thematicArea: fields.thematicArea,
    publicContactName: fields.publicContactName,
    publicContactEmail: fields.publicContactEmail,
    publicContactPhone: fields.publicContactPhone,
  };
  const source: KnowledgeSource = {
    kind: "funding-call",
    id: call.id,
    revision: call.revisionId,
    fingerprint: knowledgeFingerprint(call),
    url: publicFundingCallHref(call.id),
    label: `Publication ${call.revisionNumber}: ${fields.title}`,
  };
  const amounts = `Minimum funding amount: ${fields.minimumGrantAmount}. Maximum funding amount: ${fields.maximumGrantAmount}. Total funding envelope: ${fields.totalBudgetEnvelope}. Currency is not specified by this source.`;
  const dates = `Opens: ${fields.opensAt}. Closes: ${fields.closesAt}. Publication lifecycle: ${call.status}. Check the source page for current availability.`;
  const contact = [
    fields.publicContactName,
    fields.publicContactEmail,
    fields.publicContactPhone,
  ]
    .filter(Boolean)
    .join("; ");
  const documents = (fields.publicDocuments ?? []).filter((item) =>
    publicKnowledgeUrl(item.url),
  );
  const text = [
    fields.title,
    description,
    amounts,
    dates,
    eligibility,
    fields.fundingInstrument
      ? `Funding instrument: ${fields.fundingInstrument}`
      : "",
    fields.thematicArea ? `Thematic area: ${fields.thematicArea}` : "",
    contact ? `Public contact: ${contact}` : "",
    ...documents.map(
      (document) =>
        `Public reference: ${document.label} (${document.url}). Document contents are not included in this knowledge release.`,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
  return { source, facts, text, description };
}

export function prepareChatbotKnowledge(
  selection: KnowledgeSelection,
  data: {
    calls: FundingCallKnowledgeProjection[];
    faqs: FaqKnowledgeProjection[];
    eligibility: PublicEligibilityKnowledge;
    contact?: ContactKnowledgeProjection | null;
  },
): PreparedKnowledge {
  const snapshot: PreparedKnowledge = {
    schemaVersion: 1,
    selection: {
      fundingCallIds: [...selection.fundingCallIds].sort(),
      faqIds: [...selection.faqIds].sort(),
      ...(selection.contact ? { contact: true } : {}),
      ...(selection.eligibilityCallIds
        ? { eligibilityCallIds: [...selection.eligibilityCallIds].sort() }
        : {}),
    },
    sources: [],
    records: [],
    issues: [],
  };
  for (const call of data.calls) {
    if (selection.fundingCallIds.includes(call.id)) {
      const value = callKnowledge(call);
      snapshot.sources.push(value.source);
      snapshot.records.push({
        id: `call:${call.id}`,
        kind: "funding-call",
        title: call.publicFields.title,
        source: value.source,
        scope: {
          fundingCallId: call.id,
          rulesetVersionId: call.eligibilityVersionId,
        },
        facts: value.facts,
        text: value.text,
      });
      if (
        !value.description ||
        !call.publicFields.title ||
        !call.publicFields.opensAt ||
        !call.publicFields.closesAt
      ) {
        snapshot.issues.push({
          recordId: `call:${call.id}`,
          code: "MISSING_DATA",
          message: "The published call needs a title, description and dates.",
        });
      }
      if (
        (call.publicFields.publicDocuments ?? []).some(
          (item) => !publicKnowledgeUrl(item.url),
        )
      ) {
        snapshot.issues.push({
          recordId: `call:${call.id}`,
          code: "MISSING_DATA",
          message: "A public document has an unsafe or missing citation URL.",
        });
      }
    }
    if (
      !(selection.eligibilityCallIds ?? selection.fundingCallIds).includes(
        call.id,
      )
    )
      continue;
    const eligibility = prepareEligibilityKnowledge(call, data.eligibility);
    if (eligibility.source) snapshot.sources.push(eligibility.source);
    snapshot.records.push(...eligibility.records);
    snapshot.issues.push(...eligibility.issues);
  }
  for (const faq of data.faqs) {
    const answer = lexicalToKnowledgeText(faq.answer);
    const fingerprint = knowledgeFingerprint({
      question: faq.question,
      answer: faq.answer,
      text: answer.text,
    });
    const source: KnowledgeSource = {
      kind: "faq",
      id: faq.id,
      revision: fingerprint,
      fingerprint,
      url: "/faq",
      label: `Approved FAQ: ${faq.question}`,
    };
    snapshot.sources.push(source);
    snapshot.records.push({
      id: `faq:${faq.id}`,
      kind: "faq",
      title: faq.question ?? "",
      source,
      scope: null,
      facts: {},
      text: answer.text,
    });
    const messages = [...answer.issues];
    if (!faq.question?.trim() || !answer.text.trim())
      messages.push("The FAQ needs a question and readable answer.");
    for (const message of messages)
      snapshot.issues.push({
        recordId: `faq:${faq.id}`,
        code: "MISSING_DATA",
        message,
      });
  }
  if (selection.contact && data.contact) {
    const record = prepareContactKnowledge(data.contact);
    snapshot.sources.push(record.source);
    snapshot.records.push(record);
  }
  for (const [kind, ids, found] of [
    ["call", selection.fundingCallIds, data.calls.map((item) => item.id)],
    ["faq", selection.faqIds, data.faqs.map((item) => item.id)],
  ] as const) {
    for (const id of ids) {
      if (!found.includes(id))
        snapshot.issues.push({
          recordId: `${kind}:${id}`,
          code: "MISSING_SOURCE",
          message:
            "This selected source is no longer approved and publicly available.",
        });
    }
  }
  const questions = new Map<string, { text: string; id: string }>();
  for (const record of snapshot.records.filter((item) => item.kind === "faq")) {
    const key = record.title.trim().toLowerCase();
    if (!key) continue;
    const previous = questions.get(key);
    if (previous && previous.text !== record.text) {
      for (const recordId of [previous.id, record.id]) {
        snapshot.issues.push({
          recordId,
          code: "CONFLICTING_GUIDANCE",
          message: "Selected FAQs give different answers to the same question.",
        });
      }
    }
    questions.set(key, { text: record.text, id: record.id });
  }
  snapshot.records.sort((left, right) => left.id.localeCompare(right.id));
  snapshot.sources.sort((left, right) =>
    `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`),
  );
  if (
    snapshot.records.length > chatbotLimits.preparedRecords ||
    snapshot.records.some(
      (record) => record.text.length > chatbotLimits.passageCharacters,
    ) ||
    Buffer.byteLength(JSON.stringify(snapshot)) >
      chatbotLimits.knowledgeBytes ||
    Buffer.byteLength(
      JSON.stringify(
        approvedKnowledgeDocument(
          snapshot,
          "00000000-0000-4000-8000-000000000000",
          "0".repeat(64),
        ),
      ),
    ) > chatbotLimits.knowledgeBytes
  ) {
    throw new RequestValidationError(
      "Selected knowledge exceeds the tested preparation limits. Reduce the selection or shorten the source content.",
    );
  }
  return snapshot;
}
