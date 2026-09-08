# ProSME Platform — Implementation Plan

## 1. Purpose

This document defines the proposed implementation approach for the ProSME digital platform's SME Fund experience. It translates the supplied background document, website requirements, user journeys, wireframes, site maps, and ProSME Brand Guide into a phased Next.js delivery plan.

The immediate objective is to prepare a credible initial demonstration that communicates the intended user experience. The demo is not intended to represent production-ready authentication, document storage, workflow automation, or infrastructure.

## 2. Product Context

ProSME is the platform/project identity. The SME Fund is a funding initiative presented within ProSME. It is implemented by the Namibia Investment Promotion and Development Board (NIPDB) in partnership with the National Planning Commission (NPC), with support from GIZ.

The Fund aims to improve access to finance and business support for Namibian MSMEs. The initial allocation is EUR 430,000, intended to be distributed through seven funding calls. Individual grants are expected to range from N$50,000 to N$100,000.

The platform must ultimately serve three broad audiences:

1. Public visitors looking for information about the Fund.
2. Applicants checking eligibility, submitting applications, and tracking outcomes.
3. Internal users screening, evaluating, approving, administering, and reporting on applications.

## 3. Delivery Principles

- Prioritise a clear end-to-end applicant journey.
- Design mobile-first because applicants may access the platform from phones or tablets.
- Use plain language and make eligibility requirements visible before registration.
- Separate public content, applicant functions, and internal administration.
- Treat security, accessibility, privacy, and auditability as core requirements.
- Build production features incrementally rather than disguising demo behaviour as completed functionality.
- Keep business rules configurable where programme criteria may change between funding calls.
- Prefer mature, maintained libraries for common UI, form, validation, table, chart, date, and notification concerns. Custom code should focus on SME Fund business rules and user journeys.
- Add a dependency only when it removes meaningful implementation or maintenance work; avoid overlapping libraries that solve the same problem.

## 4. Initial Demo Scope

### 4.1 Demo objective

Demonstrate how a Namibian entrepreneur can discover the Fund, determine whether they qualify, prepare an application, submit it, and understand what happens next.

### 4.2 Primary demo journey

```text
Landing page
    -> View funding opportunity
    -> Check eligibility
    -> Start application
    -> Complete multi-step form
    -> Review and submit
    -> Receive application reference
    -> View application status on dashboard
```

### 4.3 Demo pages

| Route | Purpose | Priority |
| --- | --- | --- |
| `/` | Public landing page and Fund overview | Must have |
| `/funding` | Funding opportunity, support offered, and key dates | Must have |
| `/eligibility` | Interactive eligibility checker | Must have |
| `/how-to-apply` | Application steps and document checklist | Must have |
| `/apply` | Multi-step application experience | Must have |
| `/apply/confirmation` | Submission confirmation and reference number | Must have |
| `/dashboard` | Applicant application status and next actions | Must have |
| `/admin` | Internal application overview | Time permitting |
| `/admin/applications` | Internal application register | Time permitting |
| `/admin/applications/[id]` | Application review summary | Time permitting |

### 4.4 Demo behaviour

The demo will use realistic seeded data and simulated actions. It may retain application progress in browser storage so that navigation feels continuous.

The following are explicitly outside the initial demo implementation:

- Production identity management and account recovery.
- Persistent server-side database records.
- Uploading files to cloud object storage.
- Virus scanning and document validation.
- Sending email or SMS notifications.
- Automated assessor allocation or approval routing.
- Production scoring and decision rules.
- AI chatbot integration.
- CMS authoring workflows.
- GCP deployment and production monitoring.

## 5. Proposed User Experience

### 5.1 Public website

The public website should answer the following questions quickly:

- What is the SME Fund?
- Who is it for?
- What support is available?
- Am I eligible?
- Which documents do I need?
- How do I apply?
- What happens after submission?
- How can I request help?

The recommended visual direction is a full-width hero with conventional top navigation, based on Option 2 in the supplied high-fidelity concepts. The content should focus specifically on the SME Fund rather than the wider investment-platform examples shown in some mockups.

### 5.2 Eligibility checker

Applicants should be able to check eligibility before creating an account. Each question should explain why the criterion matters and, when the answer is negative, what the applicant may need to do before applying.

Initial eligibility rules from the supplied requirements are:

1. The business is at least 51% Namibian-owned.
2. The business is registered on the NIPDB MSME database.
3. The business is registered with relevant statutory and sectoral institutions.
4. The business is in good standing with NAMRA.
5. The business is in good standing with the Social Security Commission.
6. The business has valid MSME status or certification.
7. The business has a functional business bank account.
8. The business has operated for at least one year.
9. The business has a feasible model with traction and growth potential.
10. The business is ready for expansion, export, or investment opportunities.
11. The applicant can provide a police clearance certificate or proof of application.

Pre-incubation or acceleration participation is currently optional and should not cause automatic disqualification unless stakeholders revise the rule.

The demo should produce one of three outcomes:

- **Likely eligible:** all mandatory criteria are satisfied.
- **Action required:** one or more administrative documents or registrations are outstanding.
- **Not currently eligible:** a fundamental criterion such as Namibian ownership or minimum operating history is not satisfied.

This result is guidance only; final eligibility remains subject to verification and assessment.

### 5.3 Application form

The application should be divided into manageable steps:

1. **Applicant information**
   - Email address
   - Name and surname
   - Gender
   - Age
   - Nationality
   - Confirmation to proceed

2. **Business information**
   - Registered business name
   - Registration number
   - Applicant's position in the business
   - Ownership and control
   - Statutory registrations
   - Years in operation
   - Contact details
   - Annual turnover
   - Number of employees
   - Primary sector
   - Region of operation
   - Export readiness
   - NIPDB MSME database registration

3. **Funding request**
   - Amount requested
   - Intended use of funds
   - Expected business outcomes
   - Expected jobs created or sustained
   - Applicant expectations from the programme

4. **Supporting documents**
   - BIPA business registration
   - NAMRA Good Standing Certificate
   - Social Security Commission Good Standing Certificate
   - MSME Certificate
   - Police Clearance Certificate or proof of application
   - Bank confirmation letter or bank statement
   - Business profile, maximum five pages
   - Pitch deck, maximum twelve slides
   - Incubation or acceleration certificate, where applicable

5. **Review and declaration**
   - Review captured information
   - Confirm information is true, accurate, and complete
   - Confirm eligibility statements
   - Consent to verification
   - Acknowledge consequences of false or misleading information
   - Accept programme terms and conditions

6. **Confirmation**
   - Display a unique reference number
   - Confirm successful receipt
   - Explain the next review stage
   - Provide a link to the applicant dashboard

### 5.4 Applicant dashboard

The initial dashboard should show:

- Applicant name and profile summary.
- Current and previous applications.
- Application reference, submission date, and status.
- A visual status timeline.
- Outstanding actions or information requests.
- Recent notifications.
- Supporting-document summary.

Suggested status model:

```text
Draft
  -> Submitted
  -> Completeness Check
  -> Technical Assessment
  -> Finance Review
  -> Committee Decision
  -> Approved / Declined / More Information Required
  -> Agreement and Implementation
```

### 5.5 Internal dashboard

The internal experience will ultimately require role-based views for administrators, operational users, assessors, finance users, management, communications users, and system administrators.

For the initial prototype, the internal dashboard follows the supplied Annexure dashboard composition and shows:

- Total applications and status counts.
- Recent applications.
- Applications requiring attention.
- A sector summary.
- A read-only application details screen.
- A visual representation of the review workflow.

No production decision or approval action should be implied until roles, scoring, delegated authority, and decision templates are confirmed.

## 6. Proposed Technical Architecture

### 6.1 Demo architecture

- **Framework:** Next.js using the App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS using the supplied ProSME brand system
- **Brand typography:** Blanquotey for display copy and Bahnschrift for interface and body copy
- **Brand palette:** Cream `#F6F4E2`, yellow `#FFCA45`, sky blue `#6BAED6`, navy `#0A183B`, gold `#C9A24D`, green `#16A34A`, and orange `#FF6F00`
- **Rendering:** Server Components by default; Client Components for interactive forms
- **UI components:** shadcn/ui components built on accessible primitives
- **Icons:** Lucide React
- **Forms:** React Hook Form
- **Validation:** Zod schemas connected through the Hook Form resolver
- **Demo persistence:** Zustand with its persistence middleware where cross-page browser state is required
- **Tables:** TanStack Table for sortable and filterable internal application lists
- **Charts:** Recharts through the shadcn/ui chart components
- **Notifications:** Sonner
- **Dates:** date-fns
- **Data:** Typed fixtures and mock repository functions
- **Deployment target:** Local demo initially

The demo should not introduce a separate state library for values that are local to one component, nor a data-fetching library while all records are local fixtures. Native React and Next.js capabilities remain the default for simple cases.

### 6.2 Reuse policy

The team should not create bespoke versions of standard controls or infrastructure when an established library already covers the requirement. The initial library map is:

| Requirement | Preferred implementation | Avoid building |
| --- | --- | --- |
| Buttons, inputs, dialogs, sheets, tabs, cards, progress, badges, navigation | shadcn/ui | A new component system from scratch |
| Accessible interactive behaviour | Primitives supplied through shadcn/ui | Hand-written focus trapping and keyboard interaction |
| Icons | Lucide React | One-off inline SVG icon collection |
| Multi-step form state and field errors | React Hook Form | A custom form framework |
| Runtime validation and inferred types | Zod | Duplicated manual validators and TypeScript interfaces |
| Persisted demo application state | Zustand persistence middleware | Custom storage event and hydration code |
| Admin data grids | TanStack Table | Custom sorting, filtering, and pagination logic |
| Dashboard visualisations | Recharts via shadcn/ui charts | Custom SVG or canvas chart rendering |
| Toast notifications | Sonner | A custom notification queue and animation system |
| Date formatting and calculations | date-fns | Hand-written date parsing and formatting helpers |

Before adding another package, check whether Next.js, React, the selected UI system, or an existing dependency already provides the capability. Dependencies will be pinned by the package lock and reviewed during upgrades.

### 6.3 Production direction

The final technology choices depend on NIPDB's GCP standards and security requirements. A reasonable target architecture is:

```text
Next.js web application
    -> Authentication and role-based access control
    -> Server-side API/service layer
    -> Relational application database
    -> Cloud object storage for documents
    -> Background jobs and notification service
    -> Audit and monitoring services
    -> Headless CMS for public content
```

Potential GCP-aligned components can be evaluated during technical design. No specific managed service should be committed until hosting constraints, procurement rules, identity requirements, data residency, and operational ownership are confirmed.

### 6.4 CMS decision

The supplied annexure mentions WordPress, while the current application direction is Next.js. The options requiring stakeholder agreement are:

1. Next.js frontend with WordPress operating as a headless CMS.
2. Next.js frontend with another approved headless CMS.
3. Next.js application with a custom content-administration module.

For the initial demo, public content will be maintained in typed local content files. This avoids prematurely selecting a CMS architecture.

## 7. Suggested Project Structure

```text
src/
  app/
    (public)/
      page.tsx
      funding/page.tsx
      eligibility/page.tsx
      how-to-apply/page.tsx
    apply/
      page.tsx
      confirmation/page.tsx
    dashboard/
      page.tsx
    admin/
      page.tsx
      applications/[id]/page.tsx
  components/
    layout/
    public/
    eligibility/
    application/
    dashboard/
    ui/
  data/
    content.ts
    demo-applications.ts
    eligibility-rules.ts
  lib/
    validation/
    application-status.ts
    formatting.ts
  types/
    application.ts
    eligibility.ts
public/
  brand/
  images/
```

## 8. Initial Domain Model

The first production data model should be designed around the funding application rather than the generic project-monitoring ERD shown in the annexure.

Core entities are expected to include:

| Entity | Responsibility |
| --- | --- |
| User | Identity and access association |
| ApplicantProfile | Personal and contact information |
| Business | Registration, ownership, sector, and operating information |
| FundingCall | Configurable grant opportunity and opening period |
| EligibilityAssessment | Applicant responses and eligibility result |
| Application | Funding request and current workflow status |
| ApplicationDocument | Document metadata, type, validation, and storage reference |
| Review | Assessor or finance review record |
| InformationRequest | Request to the applicant and their response |
| Decision | Authorised decision and reason |
| Notification | In-platform, email, or SMS communication record |
| AuditEvent | Immutable record of sensitive actions and changes |

## 9. Security and Compliance Requirements

Production implementation must include:

- Secure authentication and account recovery.
- Role-based access control with least privilege.
- Server-side authorisation for every protected action.
- Encryption in transit and at rest.
- Malware scanning and type validation for uploaded documents.
- Configurable file-size and file-type restrictions.
- Immutable audit events for administrative and decision actions.
- Protection against automated submissions and common web attacks.
- Privacy notice, consent capture, and data-retention rules.
- Backup, recovery, monitoring, and incident-response processes.
- Separation of development, staging, and production environments.

The stated 1 GB limit per individual file should be reviewed. It introduces substantial upload reliability, cost, security-scanning, and storage implications and appears excessive for the requested PDFs.

## 10. Accessibility and Quality Requirements

- Target WCAG 2.2 AA accessibility.
- Full keyboard navigation and visible focus states.
- Semantic headings, labels, error messages, and status announcements.
- Sufficient colour contrast and no colour-only status indicators.
- Responsive support for mobile, tablet, and desktop.
- Save-and-resume behaviour for the production application form.
- Clear recovery from validation and network errors.
- Performance testing on constrained mobile connections.
- Cross-browser testing against the agreed support matrix.

## 11. Delivery Phases

### Phase 0 — Initial demonstrator

**Phase 0 is the only phase required for the initial demo.** The demo should be considered ready when the primary applicant journey is stable and presentable. Phases 1–6 are post-demo roadmap items and do not need to be implemented for the initial presentation.

#### Phase 0A — Must have

**Implementation status: complete for the initial demonstrator (8 September 2026).** The public information pages, eligibility checker, multi-step application, confirmation, browser-based demo persistence, and applicant dashboard have been implemented. Production integrations remain governed by the prototype boundaries in Section 4.4.

1. **Next.js foundation**
   - Establish the App Router and TypeScript project.
   - Configure Tailwind CSS and shadcn/ui.
   - Implement the responsive public layout, navigation, and footer.
   - Apply the supplied ProSME wordmark as the primary identity, together with its official palette, Blanquotey display type, Bahnschrift interface type, and reusable UI components. Present SME Fund as a programme rather than the application brand.

2. **Public landing and funding information**
   - Explain the Fund, beneficiaries, objectives, and available support.
   - Present the N$50,000 to N$100,000 grant range.
   - Provide prominent Check Eligibility and Apply Now actions.

3. **Interactive eligibility checker**
   - Implement the supplied eligibility criteria.
   - Show question progress and explanatory guidance.
   - Support likely eligible, action required, and not currently eligible outcomes.
   - Route eligible applicants into the application journey.

4. **Multi-step application prototype**
   - Capture applicant information.
   - Capture business information.
   - Capture the funding request and expected outcomes.
   - Present the supporting-document upload checklist.
   - Present the review, consent, and declaration step.
   - Simulate a successful submission.

5. **Confirmation and applicant dashboard**
   - Generate and display a realistic application reference.
   - Explain the next stage after submission.
   - Display the submitted application and status timeline.
   - Show outstanding actions and sample notifications.
   - Retain demo state for the duration of the browser session.

#### Phase 0B — Time permitting

**Implementation status: complete for the initial demonstrator.**

6. **Internal dashboard prototype**
   - Display application totals and status counts.
   - Display recent applications and items requiring attention.
   - Show the application trend and sector summary from the supplied Annexure mockup.
   - Provide a read-only application detail view.
   - Represent the intended internal review workflow without implying that production approvals are active.

The internal dashboard must not delay or destabilise the primary applicant journey.

Implemented Phase 0B routes:

| Route | Demonstrated capability |
| --- | --- |
| `/admin` | Four status metrics, application trend, sector breakdown, recent applications, system alerts, and date selector matching the supplied Annexure composition |
| `/admin/applications` | Separate searchable and sortable application register |
| `/admin/applications/[id]` | Read-only applicant, business, eligibility, funding, document, and workflow review |

#### Phase 0C — Presentation readiness

7. **Demo hardening and rehearsal**
   - Test desktop and mobile layouts.
   - Run linting and the production build.
   - Verify every link and primary interaction used in the presentation.
   - Prepare deterministic seeded applicant data.
   - Rehearse the complete presentation journey.
   - Clearly identify simulated data, submissions, uploads, and authentication.

The required demonstration path is:

```text
Home -> Eligibility -> Application -> Confirmation -> Applicant Dashboard
```

### Phase 1 — Discovery and solution design

**Post-demo roadmap.**

- Confirm programme rules and funding-call configuration.
- Confirm internal roles, scoring, approvals, and delegated authority.
- Resolve the CMS approach.
- Confirm GCP architecture and identity requirements.
- Define privacy, retention, audit, and reporting requirements.
- Produce an agreed backlog, data model, and integration specification.

### Phase 2 — Public platform

**Post-demo roadmap.**

- Implement CMS-managed public pages.
- Implement funding-call publishing.
- Implement eligibility checker configuration.
- Implement resources, FAQs, news, and contact channels.
- Add analytics, SEO, accessibility, and performance controls.

### Phase 3 — Applicant portal

**Post-demo roadmap.**

- Implement registration, authentication, and profile management.
- Implement save-and-resume applications.
- Implement secure document upload and validation.
- Implement submission, status tracking, messages, and notifications.
- Implement information-request responses and decision communication.

### Phase 4 — Internal workflow

**Post-demo roadmap.**

- Implement completeness screening.
- Implement assessor assignment and technical scoring.
- Implement finance review.
- Implement information requests and applicant responses.
- Implement approvals, decisions, and controlled communications.
- Implement role management, audit logs, and administration.

### Phase 5 — Reporting and programme monitoring

**Post-demo roadmap.**

- Implement application and funding statistics.
- Implement sector, region, beneficiary, and job-impact reporting.
- Implement agreements, allocations, expenditure, and compliance tracking.
- Implement exportable operational and management reports.

### Phase 6 — Production readiness and handover

**Post-demo roadmap.**

- Complete security and accessibility testing.
- Complete performance, backup, and disaster-recovery testing.
- Migrate approved content and configuration.
- Train content editors, administrators, assessors, and support staff.
- Deploy staging and production environments.
- Complete operational handover and support documentation.

## 12. Initial Demo Acceptance Criteria

The initial demonstration is successful when:

- The application starts reliably with a documented command.
- The public site clearly explains the SME Fund and available support.
- The layout works on desktop and mobile sizes.
- A visitor can complete the eligibility checker and receive a useful result.
- An eligible visitor can start and complete the application journey.
- The form contains the main fields and document categories from the requirements.
- Review and declaration are shown before submission.
- Submission produces a realistic reference and confirmation message.
- The applicant dashboard displays the submitted application's status.
- Prototype-only behaviour is clearly identifiable and does not imply production integration.
- There are no obvious broken links, unhandled errors, or demo-blocking console errors.

## 13. Demo Presentation Flow

1. Introduce the Fund through the landing page.
2. Explain the two calls to action: check eligibility and apply.
3. Complete an eligible scenario in the eligibility checker.
4. Show the requirements and document checklist.
5. Complete the key stages of the application form.
6. Review the declaration and submit.
7. Show the application reference and applicant dashboard.
8. If available, switch to the internal dashboard and show how an application will enter the review queue.
9. Close by separating demonstrated experience from the production roadmap.

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Demo mistaken for completed production functionality | Incorrect expectations | Label mock data and state prototype boundaries during the demo |
| Unconfirmed workflow and scoring rules | Rework in internal portal | Keep workflow configurable and defer irreversible design decisions |
| WordPress and Next.js requirements conflict | Architecture uncertainty | Agree whether WordPress is headless, replaced, or separately hosted |
| Partner-brand hierarchy is not fully specified | Incorrect logo prominence | Use ProSME as the primary application brand and SME Fund as the programme; confirm required NIPDB, NPC, and GIZ placements |
| Large document limits | Cost and security risk | Confirm realistic file sizes and upload process during discovery |
| Limited content and no beneficiary stories | Sparse public pages | Use approved background content and neutral placeholders only where necessary |
| Undefined privacy and retention requirements | Compliance risk | Make these mandatory discovery outputs before production uploads |
| Broad annexure scope | Unrealistic delivery expectations | Deliver by phases, beginning with the applicant funding journey |

## 15. Decisions Required From Stakeholders

The following questions should be captured during or immediately after the initial demo:

1. Confirm the final lock-up and placement rules for the ProSME platform identity and the SME Fund programme mark.
2. Is WordPress mandatory, and if so, may it operate as a headless CMS behind Next.js?
3. What are the required placement and minimum-size rules for NIPDB, NPC, GIZ, and other partner marks on the website?
4. What are the opening and closing dates for the first funding call?
5. Which eligibility rules are hard disqualifiers and which may be resolved later?
6. How are applications scored, weighted, assigned, reviewed, and approved?
7. Which internal roles may view, edit, recommend, approve, or communicate decisions?
8. What identity provider or account-registration model is required?
9. What are the approved GCP services, environments, and deployment controls?
10. What are the data residency, privacy, document retention, and audit requirements?
11. Which email and SMS providers should send notifications?
12. What file formats and realistic size limits apply to each document category?
13. Are applications accepted only in English, or must other languages be supported?
14. Which operational and management reports are mandatory?
15. Who owns public content, FAQs, applicant support, and escalation responses?

## 16. Immediate Implementation Order

For the initial demonstrator, work should proceed in this order:

1. Create the Next.js foundation and global responsive layout.
2. Establish the provisional SME Fund visual language and reusable components.
3. Build the landing and funding-information experience.
4. Build the eligibility checker and its three outcomes.
5. Build the multi-step application form and review screen.
6. Build confirmation and applicant dashboard continuity.
7. Add the internal dashboard if the primary journey is stable.
8. Run linting, build checks, responsive checks, and a complete demo rehearsal.
