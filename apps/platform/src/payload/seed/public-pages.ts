import { approvedPageParagraphs, defaultPages } from "../../modules/content/content.defaults";
import { defaultEligibilityFocusSection } from "../../modules/content/eligibility-page-content";
import { defaultFundingPriorities, defaultFundingSupport } from "../../modules/content/funding-page-content";

export const publicPages = [
  { slug: "about", ...defaultPages.about, paragraphs: approvedPageParagraphs.about },
  { slug: "funding", title: "Funding to move your business forward", summary: "Targeted grants and practical enterprise support for eligible Namibian MSMEs with a feasible model, real traction and ambition to grow.", paragraphs: [defaultFundingSupport.description], layout: [
    { blockType: "fundingSupport" as const, ...defaultFundingSupport, uses: defaultFundingSupport.uses.map((label) => ({ label })) },
    { blockType: "fundingPriorities" as const, ...defaultFundingPriorities },
  ] },
  { slug: "eligibility", title: "Check your eligibility", summary: "Answer the published screening questions before starting an application.", paragraphs: ["This checker is private and indicative. Final eligibility is confirmed through document verification and formal screening.", "Participation in a pre-incubation or acceleration programme is optional at this stage."], layout: [
    { blockType: "eligibilityFocusSectors" as const, ...defaultEligibilityFocusSection },
  ] },
  { slug: "how-to-apply", title: "Know what you need before you begin", summary: "Follow the application guidance and prepare your supporting documents in advance.", paragraphs: ["Check the current funding call and complete the eligibility checker before applying.", "Prepare current, legible PDF copies of the supporting documents listed in the published funding criteria.", "Complete each application section, review the declaration and retain your application reference after submission."] },
  { slug: "news", title: "Latest news", summary: "Official announcements and programme updates from the SME Fund.", paragraphs: ["Published programme updates appear below."] },
  { slug: "resources", title: "Guides and documents", summary: "Approved programme information to help your MSME prepare and apply.", paragraphs: ["Published guides and programme documents appear below."] },
  { slug: "events", title: "Events", summary: "Official briefings, workshops and enterprise-development events.", paragraphs: ["Published programme events appear below."] },
  { slug: "faq", title: "Frequently asked questions", summary: "Answers to common questions about the SME Fund and application process.", paragraphs: ["The answers below are maintained by the programme content team."] },
  { slug: "contact", title: "Contact the SME Fund", summary: "Send the team a question about programme information, eligibility or application support.", paragraphs: ["Use the contact form for programme and application enquiries. The team will respond using the contact details you provide."] },
  { slug: "privacy", ...defaultPages.privacy, paragraphs: approvedPageParagraphs.privacy },
  { slug: "terms", ...defaultPages.terms, paragraphs: approvedPageParagraphs.terms },
];
