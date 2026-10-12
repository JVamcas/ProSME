import {
  isPublicPageVisible,
  type PublicPageVisibility,
} from "@/modules/content/domain/PublicPageVisibility";
import type { KnowledgeSelection } from "./ChatbotKnowledge";

export function visibleKnowledgeSelection(
  selection: KnowledgeSelection,
  visibility: PublicPageVisibility,
): KnowledgeSelection {
  return {
    ...selection,
    fundingCallIds: isPublicPageVisible(visibility, "funding")
      ? selection.fundingCallIds
      : [],
    eligibilityCallIds: isPublicPageVisible(
      visibility,
      "funding",
    )
      ? selection.eligibilityCallIds
      : [],
    faqIds: isPublicPageVisible(visibility, "faq") ? selection.faqIds : [],
    contact: isPublicPageVisible(visibility, "contact") && selection.contact,
  };
}
