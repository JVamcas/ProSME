# SME Fund AI Chatbot — Client Scope

Date: 2026-10-02

## Purpose

Record the chatbot requirements found in the supplied client documents and
define a minimal implementation that meets them without adding features.
This is a requirements summary and scope recommendation, not a record of
client approval or implementation acceptance.

## Source documents

| Source | Relevant location | What it establishes |
| --- | --- | --- |
| [Pro SME Project Inception Report](client/Pro%20SME%20Project%20Inception%20Report.pdf) | Page 9, deliverable 5; page 15, milestone M5 | A trained and developed AI chatbot, deployed and demonstrated to the client/stakeholders. |
| [Terms of Reference](source-material/Terms%20of%20Reference%20-2.pdf) | Page 7, “AI-Powered Chatbot and Smart Assistance”; page 9, deliverables | The functional chatbot requirements and a programme-specific knowledge base integrated into the live website. |
| [Website Information Request](source-material/Website%20Information%20Request_.docx) | Section 4, “AI Chatbot Knowledge Base” | FAQs, programme documentation, policy PDFs, common applicant questions and designated escalation contacts are needed. The client response requests an FAQ knowledge base and coordination with Lenis. |
| [M&E Workflow Engine Specification](client/ME-Workflow-Engine-Specification.docx) | Sections 12.2 and 13 | Applicant-facing information must exclude internal assessment details; public, applicant and internal assessment areas are separate trust zones. |

The inception report lists the chatbot deliverable. The referenced Terms of
Reference provides the detailed functional scope.

## Explicit client requirements

1. Integrate an AI-powered chatbot into the website for visitors and applicants.
2. Make the chatbot available around the clock.
3. Ground its programme knowledge in SME Fund content covering:
   - Eligibility criteria.
   - Funding instruments.
   - Application processes.
   - Frequently asked questions.
4. Respond to questions in plain English.
5. Provide an escalation pathway through human handoff **or** logging unresolved
   questions for follow-up.
6. Report monthly chatbot interaction analytics to administrators.
7. Deploy the programme-specific chatbot and demonstrate its functionality to
   the client/stakeholders.

Staff training, manuals, technical documentation and source-code handover are
overall project deliverables. Include chatbot operation and maintenance in
those existing deliverables rather than creating an additional training system.

## Recommended minimum implementation

| Item | Scope |
| --- | --- |
| Website chat widget | A simple interface for visitors and applicants to ask questions and receive plain-English answers. |
| Approved knowledge base | Use the supplied and approved SME Fund material for the four subject areas listed above. |
| Unresolved-question logging | Let the user request follow-up and record the question with the contact details needed for staff to respond. |
| Monthly interaction report | Provide administrators with monthly usage and unresolved-question information. Agree the exact metrics and delivery format with the client. |
| Deployment and handover | Demonstrate the chatbot, verify it against approved questions and document how staff maintain its content and handle unresolved queries. |

Unresolved-question logging is the recommended minimum escalation option
because the Terms of Reference explicitly allows it as an alternative to human
handoff. Do not build live operator chat unless the client requests that option.
Around-the-clock chatbot availability does not imply around-the-clock human
support.

## Implementation choices, not additional requirements

The client specifies the behaviour and programme knowledge, not a particular
model provider, vector database, AI framework or model-training technique.

Retrieval-augmented generation is a suitable implementation approach: retrieve
relevant approved content and use an AI model to explain it. Confirm that this
meets the client's intended meaning of a trained chatbot during the
demonstration and acceptance process. Do not assume custom model fine-tuning is
required.

Keep the feature inside the existing deployable application at `apps/platform`
and follow the [project structure contract](SME_Fund_Project_Structure_Contract_FINAL.md).
Reuse existing content, contact/follow-up and reporting capabilities where their
responsibilities match. Provider selection and technical design should serve
the agreed scope without adding a separate application or administration system.

## Features outside the identified scope

The supplied chatbot requirements do not request:

- Access to a user's personal application status or application records.
- Filling in, saving or submitting application forms through chat.
- Uploading or analysing applicant documents through chat.
- Making eligibility, assessment, scoring or funding decisions.
- Executing workflow actions or changing application state.
- Multilingual responses, voice chat or messaging-channel integrations.
- Live operator chat when unresolved-query logging is selected.
- A separate chatbot administration system.
- Custom model fine-tuning.

These features require a separate client request and scope agreement before
implementation. The chatbot must not expose internal scores, reviewer
identities or assessment comments. Explain published eligibility criteria as
guidance; retain eligibility decisions in the existing application process.

## Client inputs needed

- Approved knowledge materials covering the required subjects.
- A named content owner to resolve questions and approve content updates.
- The follow-up destination and staff responsible for unresolved queries.
- The monthly report recipients, metrics and delivery format.
- Representative questions and expected answers for acceptance.

These inputs complete the requested feature; they do not authorize additional
chatbot functionality.

## Acceptance checklist

- The chatbot is accessible on the live website to visitors and applicants.
- It answers approved programme questions in plain English using the approved
  SME Fund knowledge base.
- It provides a usable escalation path for unresolved questions.
- Administrators receive monthly interaction analytics in the agreed format.
- The client has seen the functionality demonstrated and recorded acceptance.
- Chatbot operation and maintenance are covered in the project handover.

No acceptance item is recorded as passed by this document.
