# SME Fund Platform — Gated Implementation Plan

## Document control

| Field | Value |
| --- | --- |
| Document | Production implementation and delivery plan |
| Version | 2.2 |
| Date | 13 September 2026 |
| Status | Execution baseline; P3.2.1 accepted; P3.2 in progress |
| Product | SME Fund platform under the ProSME Project |
| Selected design | Option B |
| Delivery scope | Remaining milestones M4–M12 |

This document is the authoritative implementation plan for production delivery after selection of Option B. The root-level `IMPLEMENTATION_PLAN.md` remains only as a record of the initial demonstrator.

### Revision history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 11 September 2026 | Initial gated production-delivery baseline |
| 1.1 | 13 September 2026 | Recorded the Phase 3 portal, workflow, permission, UI, reuse, query, and incremental-delivery agreement before implementation |
| 1.2 | 13 September 2026 | Accepted P3.0 and linked the detailed portal, workflow, capability, data/API, palette-audit, and TOR-traceability contracts |
| 1.3 | 13 September 2026 | Implemented P3.1 shared portal identity context, capability-filtered shell, owned applicant/business profiles, APIs, SQL projections, migration, tests, and review evidence |
| 1.4 | 13 September 2026 | Corrected the Phase 3 delivery sequence and visual targets, moved workflow configuration and funding-opportunity assignment before submission, and aligned portal navigation with the agreed UI boards |
| 1.5 | 13 September 2026 | Added a blocking acceptance gate and gate record for every Phase 3 increment, with P3.9 serving as the final G3 milestone acceptance |
| 1.6 | 13 September 2026 | Recorded P3.1 as not done and explicitly blocked P3.2 until the P3.1 gate is accepted |
| 1.7 | 13 September 2026 | Completed the P3.1 visual-target remediation, profile position persistence, identity refresh, phase-scoped applicant grants, and replacement verification evidence |
| 1.8 | 13 September 2026 | Added reusable accessible route tabs and consolidated all applicant profile sections under the My Profile route |
| 1.9 | 13 September 2026 | Remediated P3.1 review findings for independent profile submissions, operations application scope, read-only UI, shared route states, correlated error logging, and approved dashboard hierarchy |
| 2.0 | 13 September 2026 | Replaced the one-business-per-applicant profile assumption with an owned business collection and dedicated My Businesses CRUD workspace |
| 2.1 | 13 September 2026 | Added P3.2.1 as the blocking source-ownership increment, made client/server service boundaries explicit, and separated applicant, admin, public, and domain-owned source paths before P3.2 feature work |
| 2.2 | 13 September 2026 | Accepted P3.2.1 and implemented the P3.2 applicant Funding Opportunities list/detail slice backed by published Payload funding-call projections |

## 1. Purpose

This plan translates the Terms of Reference, Annexure B, brand guide, client feedback, approved Option B design, existing application, and existing Payload CMS into gated implementation phases.

The plan is designed to prevent incomplete work from being presented as complete. Every phase has:

- Entry conditions.
- Required implementation work.
- Objective exit criteria.
- Required evidence.
- A named acceptance authority.

Work may be developed concurrently where dependencies allow, but a downstream phase may not be accepted before its prerequisite gate has passed.

## 2. Confirmed decisions

The following decisions are fixed unless changed through the formal change-control process:

1. Option B is the approved visual and interaction direction.
2. Milestones M1, M2, and M3 are complete.
3. The existing application and existing Payload CMS are implementation inputs and must be integrated rather than rebuilt without cause.
4. Next.js App Router and TypeScript will be used for both frontend and backend HTTP functionality.
5. Payload CMS will manage website content, media, publishing, and CMS administration.
6. Payload will not be the central identity provider.
7. Real Firebase Authentication will provide applicant and staff authentication. The Firebase Auth Emulator will not be used.
8. PostgreSQL will store platform data, application users, roles, capabilities, applications, workflow records, audit events, and Payload content.
9. Authorization will be capability-based and stored in PostgreSQL.
10. The Payload local username/password strategy will be disabled. Payload will consume verified Firebase identity through a custom strategy.
11. The CMS will be served at `/cms`; the operational dashboard will remain at `/admin`.
12. M5 and M6 are swapped: M5 is the online application and workflow engine; M6 is the AI chatbot.
13. GCP is the eventual hosting environment, but GCP infrastructure implementation begins only when access and client requirements are available.
14. Applicant documents will not be stored as PostgreSQL binary data. PostgreSQL stores metadata and object references.

## 3. Requirement-source precedence

Where supplied sources conflict, content and implementation decisions follow this order:

1. Written client decisions and the latest approved feedback.
2. Formally approved design and acceptance records.
3. Terms of Reference and contractual milestone requirements.
4. Website Information Request and later validated requirements.
5. Existing SME Fund website content.
6. Annexure B.
7. SME Fund background and brand documents.
8. Clearly labelled temporary content.

The existing website is a migration source, not automatically the latest authority. For example, the feedback document’s statement that the first call is closed supersedes the historical opening and closing dates still shown on the existing website.

## 4. Milestone baseline

The client-approved milestone sequence is:

| Milestone | Contract deliverable | Target period | Current status |
| --- | --- | --- | --- |
| M1 | Project Inception Report and Validated Requirements | Week 1 | Complete |
| M2 | Three Website Design Concepts | Week 1 | Complete |
| M3 | Approved Final Design Prototype — Option B | Week 2 | Complete |
| M4 | Fully Developed and Operational Website | Week 3 | Accepted — G2 passed |
| M5 | Online Application System with Workflow Engine | Week 3 | In progress — P3.2.1 accepted; P3.2 funding opportunities implemented |
| M6 | AI Chatbot Trained and Deployed | Week 3 | Pending |
| M7 | Analytics Dashboard Configured | Week 4 | Pending |
| M8 | User Acceptance Testing Report | Weeks 5–7 | Pending |
| M9 | Staff Training — minimum two sessions | Week 5 | Pending |
| M10 | Training Manuals and Technical Documentation | Week 5 | Pending |
| M11 | Full Intellectual Property and Source Code Transfer | Weeks 5–7 | Pending |
| M12 | Thirty Days Free Post-Launch Support | After launch | Pending |

The ToR refers both to a five-week maximum and to a seven-week/two-month term, while M8 and M11 extend through week 7. The working delivery baseline is weeks 1–7 followed by 30 calendar days of support. Formal schedule clarification must be recorded without reopening the completed M1–M3 deliverables.

## 5. Gate governance

### 5.1 Gate states

Each gate must have one of these states:

| State | Meaning |
| --- | --- |
| Not started | Required work has not begun |
| In progress | Implementation or evidence collection is underway |
| Ready for review | Every checklist item is claimed complete and evidence is attached |
| Passed | Acceptance authority has approved the gate in writing |
| Failed | One or more mandatory exit criteria are unmet |
| Waived by exception | A formally authorised, time-bound exception exists |

“Implemented,” “demonstrated,” “mostly complete,” or “works locally” do not mean a gate has passed.

### 5.2 Strict gate rule

A gate passes only when:

- Every mandatory exit criterion is satisfied.
- Required evidence is stored in the repository or linked from the gate record.
- No unresolved severity-0 or severity-1 defects exist.
- Security, privacy, accessibility, and data-integrity criteria relevant to the phase have passed.
- The named acceptance authority provides written approval.

A failed gate blocks acceptance of dependent phases. Development may continue at risk, but the downstream milestone may not be reported as accepted.

### 5.3 Exception rule

A mandatory item may be waived only when the exception records:

- The unmet criterion.
- Business justification.
- Risk and impact.
- Compensating control.
- Named risk owner.
- Expiry or resolution date.
- Written approval from the client delivery authority and technical lead.

Exceptions may not waive authentication, authorization, encryption, auditability, backup recoverability, or protection of applicant data for production launch.

### 5.4 Common definition of done

All production changes must meet these conditions:

- Acceptance criteria are traceable to a requirement or approved change.
- Code is reviewed.
- Type checking, linting, tests, and production build pass.
- Authorization is enforced server-side.
- Errors are handled without leaking secrets or personal data.
- User-visible states include loading, empty, success, and recoverable failure behaviour.
- Responsive and keyboard behaviour is verified.
- Documentation and configuration examples are updated.
- No secret or real applicant data is committed.
- Database changes include reviewed, repeatable migrations.

## 6. Architecture baseline

```text
Browser
  -> Next.js public website, applicant portal and operational dashboard
  -> Firebase Authentication
  -> Secure server-side session cookie
  -> Next.js Server Components, Server Actions and Route Handlers
  -> PostgreSQL application services and repositories
  -> Payload CMS Local API and Admin Panel
  -> Object storage adapter for media and applicant documents
  -> Job queue for notifications, reports and scheduled work
```

### 6.1 Responsibility boundaries

| Component | Owns | Must not own |
| --- | --- | --- |
| Firebase Authentication | Credentials, identity verification, password reset, email verification, authentication sessions | Application roles, workflow permissions, funding decisions |
| PostgreSQL application schema | Users, external identity links, roles, capabilities, applications, workflow, decisions, audit events | Uploaded file binaries |
| Payload CMS | Public content, media metadata, FAQs, resources, events, funding-call content, publishing history | Central credentials or application authorization policy |
| Next.js backend | Session exchange, authorization checks, domain services, APIs, integrations | Long-lived secrets in client code |
| Object storage | CMS media and applicant documents | Authorization decisions |

### 6.2 Required route boundaries

| Route | Responsibility |
| --- | --- |
| `/` and public routes | Public SME Fund website |
| `/portal` | Authenticated applicant experience |
| `/admin` | Authenticated internal operations and workflow |
| `/cms` | Authenticated Payload content administration |
| `/api/auth/*` | Firebase session lifecycle |
| `/api/*` | Explicit integrations, webhooks, exports, uploads and chatbot endpoints |

### 6.3 Approved repository and file structure

The normative structure is defined in [`docs/architecture/PROJECT_STRUCTURE.md`](architecture/PROJECT_STRUCTURE.md). It records the complete repository tree, Next.js route groups, Firebase authentication boundary, PostgreSQL layout, Payload layout, module convention, and integration layout.

The controlling structural decisions are:

1. `apps/platform` is the only deployable application.
2. The public site, applicant portal, internal operations, Payload Admin Panel, and backend route handlers run in one Next.js application.
3. Payload is embedded at `/cms`; separate web, API, or CMS applications must not be created.
4. Next.js routes use the approved `(public)`, `(auth)`, `(portal)`, `(operations)`, and `(payload)` groups.
5. Firebase code belongs under `src/auth/firebase`; capability enforcement belongs under `src/auth/authorization`.
6. Application persistence belongs under `src/db`; business behavior belongs under `src/modules`.
7. Payload code is separated into content, programme, and system collections under `src/payload`.
8. Options A and C remain archived as M2 evidence and are excluded from active builds.
9. The repository-wide implementation rules in [`AGENTS.md`](../AGENTS.md) are mandatory, including file-size limits and component-reuse requirements.

Any structural deviation requires an approved architecture change and corresponding updates to both documents before code is moved or introduced.

## 7. Environment strategy

The minimum environment model is:

| Environment | Purpose | Data policy |
| --- | --- | --- |
| Development | Active engineering using a real Firebase development project and development PostgreSQL | Synthetic/test data only |
| Staging/UAT | Client validation and release candidate testing | Approved test data only; never production applicant data |
| Production | Live service on the approved GCP environment | Real data under approved privacy and retention controls |

Each environment must use separate Firebase configuration, PostgreSQL credentials, storage location, encryption material, and analytics configuration. Production secrets must not be shared with development or staging.

## 8. Phase and gate plan

## Phase 0 — Completed discovery and design

**Milestones:** M1–M3  
**Status:** Complete by client direction

### Accepted outputs

- Project inception and validated-requirements milestone accepted.
- Three design concepts delivered.
- Option B selected and approved.

### Carry-forward dependencies

Unresolved downstream details do not reopen M1–M3, but they must be resolved before the gate that depends on them:

- Final role-to-capability matrix.
- Scoring rubric and weights.
- Delegated approval authority.
- Information-request and decision templates.
- Realistic document size limits to replace or formally accept the stated 1 GB per-file limit.
- Firebase project configuration and ownership.
- Email delivery provider and sender approval.
- Final GCP landing-zone, network, storage, monitoring, and operational requirements.

### Gate G0 — Design baseline

**State:** Passed  
**Acceptance authority:** Client project authority

## Phase 1 — Repository and integration foundation

**Supports:** M4 and M5  
**Gate:** G1  
**Status:** Passed — real-Firebase evidence, live authorization checks, and technical-lead acceptance recorded

### Entry conditions

- G0 passed.
- Existing application and Payload CMS source are available to the implementation team.
- Real Firebase development-project configuration is available.
- Development PostgreSQL is available.

### Required work

1. Promote Option B to the active production application.
2. Remove Options A and C from active build and deployment scripts while retaining them as design evidence.
3. Establish and verify the complete structure in `docs/architecture/PROJECT_STRUCTURE.md`.
4. Integrate Payload into the Next.js App Router application at `/cms`.
5. Configure Payload’s PostgreSQL adapter and committed migrations.
6. Establish application-owned PostgreSQL tables and migration ownership.
7. Integrate real Firebase Authentication.
8. Implement ID-token exchange for secure server-side session cookies with CSRF protection.
9. Create PostgreSQL user, identity, role, capability, and mapping tables.
10. Disable Payload local authentication and implement the Firebase session strategy.
11. Establish server-side authorization helpers.
12. Add environment validation, structured logging, health endpoint, and error handling.
13. Pin production dependency versions and commit the lockfile.
14. Configure continuous checks for lint, types, tests, migrations, and production build.
15. Enforce the `AGENTS.md` file-size, route-responsibility, utility-component, and reuse rules during review.

### Gate G1 — Foundation ready

**Acceptance authority:** Technical lead  
**Required evidence:** `docs/testing/gates/G1-foundation.md`

G1 passes only when:

- A clean checkout installs and builds using documented commands.
- The implementation conforms to `docs/architecture/PROJECT_STRUCTURE.md`; any approved deviations are documented.
- Handwritten files comply with `AGENTS.md` size limits, and duplicated UI primitives or feature components have been removed.
- Lint and TypeScript checks pass with no ignored failures.
- Application and Payload migrations apply successfully to an empty PostgreSQL database.
- The migration status is clean after application.
- A real Firebase test applicant can register, verify, sign in, establish a server session, and sign out.
- Invalid, expired, and revoked sessions are rejected.
- A user without CMS capabilities cannot access `/cms`.
- An authorised CMS user can access `/cms` without a Payload password.
- A user without operational capabilities cannot access `/admin` data or mutations.
- No credentials appear in source control, browser bundles, logs, or test artifacts.
- Health checks report application and database readiness without exposing sensitive configuration.

## Phase 2 — Public website and Payload content delivery

**Milestone:** M4  
**Gate:** G2
**Status:** Passed — full validation and client acceptance recorded

### Entry conditions

- G1 passed.
- Approved Option B feedback and content sources are available.

### Required work

1. Apply the approved orange header, white logo, visible secondary navigation, and Option B responsive treatment.
2. Replace “Find Funding” with “Apply Now” and provide application tracking.
3. Use “MSME” consistently except in SME Fund and ProSME proper names.
4. Implement approved programme statistics: seven funding calls, 14 regions, N$50,000–N$100,000 grant range, and 200+ MSMEs targeted.
5. Replace unsupported fictional funding opportunities and success stories with approved news and resources.
6. Add the approved funding-criteria document.
7. Add the focus-sector presentation while retaining the rule that all sectors may apply.
8. Implement About, Funding, Eligibility, How to Apply, News, Resources, Events, FAQ, Contact, Privacy, and Terms pages.
9. Configure Payload collections, globals, publishing roles, versions, and content audit history.
10. Implement working contact and newsletter forms with consent and error states.
11. Add metadata, sitemap, robots controls, structured data, and analytics consent integration points.
12. Optimise images, fonts, and page payloads for constrained connectivity.
13. Finalise and enforce the resource-specific CMS capability matrix for content, programme, media, site-setting, and engagement resources.
14. Keep CMS principals read-only in Payload and visible only to system administrators; bootstrap the first administrator through the application-owned script.

### Gate G2 — M4 website accepted

**Acceptance authority:** Client content owner and client project authority  
**Required evidence:** `docs/testing/gates/G2-public-website.md`

G2 passes only when:

- Every required public route exists and has approved content or an explicitly accepted “coming soon” state.
- Content editors can create, edit, preview, review, publish, unpublish, and restore content according to their permissions.
- CMS resource permissions are independently enforced in Payload and in authenticated frontend draft rendering.
- An applicant cannot access `/cms`, and no CMS role can manage application users, roles, or capabilities through Payload.
- Published website content is read from Payload rather than duplicated in page source.
- Option B feedback items are traceably closed or formally excepted.
- Navigation and footer contain no placeholder links.
- Contact and subscription submissions are persisted or delivered through the approved integration.
- Copyright, contact address, programme names, statistics, and first-call status are correct.
- No fabricated opportunity, beneficiary, success-story, deadline, or programme result is displayed.
- Public pages work at agreed mobile, tablet, and desktop breakpoints.
- Keyboard navigation, focus visibility, headings, labels, contrast, and automated accessibility checks pass.
- The production build and public-route smoke test pass.

## Phase 3 — Applicant portal and workflow engine

**Milestone:** M5  
**Gate:** G3
**Status:** P3.0, P3.1, and P3.2.1 accepted; P3.2 in progress

### Current delivery record

| Item | State | Evidence or note |
| --- | --- | --- |
| G1 foundation | Passed | Recorded in `docs/testing/gates/G1-foundation.md` |
| G2 public website | Passed | Recorded in `docs/testing/gates/G2-public-website.md` |
| TOR and Phase 3 UI review | Complete | Requirements and proposed screens reviewed for the plan |
| Portal, workflow, data, and permission design | Agreed | P3.0 contracts accepted in `docs/testing/gates/P3.0-design-contracts.md` |
| Phase 3 database/domain implementation | In progress | P3.2.1 accepted; the published funding-call integration is implemented |
| Applicant portal implementation | In progress | P3.2 Funding Opportunities list and detail are implemented; eligibility and drafts remain pending |
| Operations/work-queue implementation | Not started | Existing fixture-backed screens are inputs, not Phase 3 completion evidence |
| G3 evidence and acceptance | Not started | Created only as independently testable increments are completed |

P3.0, P3.1, and P3.2.1 are accepted. P3.2 is in progress, beginning with the
applicant Funding Opportunities list and detail slice.

### Conversation decision record

This section is the Phase 3 decision record from the implementation-planning
discussion. A later change must update the decision and its affected increment
before implementation continues.

| Topic | Agreed direction |
| --- | --- |
| Brand | Applicant and operations portals use the SME Fund logo, not the ProSME logo. |
| Portal colour | The shared authenticated portal sidebar uses the canonical SME Fund orange. Navy is used for readable sidebar text/icons and the active item. |
| Application palette | Phase 3 uses the client brand-guide colours: cream `#F6F4E2`, yellow `#FFCA45`, blue `#6BAED6`, navy `#0A183B`, gold `#C9A24D`, green `#16A34A`, and orange `#FF6F00`, with white as a supporting application neutral. It does not use legacy orange compatibility aliases or hard-coded legacy orange values. |
| Primary colour | Canonical SME Fund orange `#FF6F00` is the primary brand and action colour. Primary calls to action use an orange surface with navy content. |
| Icon colour | Standalone brand and navigation icons use canonical orange. Icons on an orange surface use navy for visibility; status icons may use an approved semantic colour when they communicate success, warning, or error. |
| Accessible colour use | Orange is a brand surface/accent, not body text on white. When canonical orange would not meet text/icon contrast, use brand navy rather than introducing or reusing a darker orange. |
| Deployment | Phase 3 remains inside the one approved `apps/platform` Next.js application. No separate applicant, admin, API, or workflow application is created. |
| Portal model | One authenticated portal system has permission-scoped applicant and operations route spaces. It does not duplicate portal infrastructure. |
| Route ownership | Applicant self-service remains under `/portal`; internal operations remains under `/admin`; Payload remains under `/cms`. |
| Route visibility | Sidebars are produced from typed route metadata and filtered by capabilities, following the useful WorkflowHub route-filtering pattern. |
| UI permission boundary | A reusable `CapabilityGate`, modelled on WorkflowHub's `PermissionGate`, supports one/any/all checks, hide/forbid modes, fallbacks, and resource context. |
| Security boundary | Sidebar filtering and `CapabilityGate` improve usability only. Layouts/pages, API or Server Actions, services, repositories, and storage access enforce the same policy server-side. |
| Workflow model | Definition/version/stage/task/transition configuration is separated from application workflow/stage/task instances. |
| Versioning | Published workflow versions are immutable; each submitted application pins the exact published version it uses. |
| Funding-opportunity workflow assignment | Workflow Configuration assigns a published workflow version to a funding opportunity. Applicants may discover opportunities, assess eligibility, create, save, resume, and complete drafts without that assignment; only submission requires it. The assignment is a state within Workflow Configuration and is not a separate sidebar route. |
| Configurability | Stages, tasks, order, assignments, criteria, labels, actions, and transitions are configuration rather than hard-coded pages. |
| Task extensibility | Registered task types have typed configuration/result schemas and renderers. More configured tasks need no deployment; genuinely new behaviour is added as a new registry entry. |
| Form extensibility | A bounded `STRUCTURED_FORM` type covers ordinary future staff forms without becoming an unrestricted form/BPM builder. |
| Assignment | Stages have a default role assignee; tasks may override it with a role or named user. Assignment and permission are separate concerns. |
| Work queue | Queue rows represent actionable `StageTaskInstance` records assigned directly or through an eligible role, not whole applications. |
| Applicant status | Applicant-facing labels/descriptions are configured separately and never expose internal stages, scores, comments, recommendations, assignments, or deliberations. |
| Information requests | A request is a first-class request/response record that blocks the originating task and returns it to the queue after the applicant responds. It is not a brittle stage loop. |
| Automated pre-screening | Rules categorise and prioritise applications with explanations; they assist staff and do not silently make the funding decision. |
| Manual override | Override requires an explicit capability and reason and records actor, time, prior value, and new value in immutable audit history. |
| Client uncertainty | The project provides a TOR-aligned draft reference workflow and guided preview. The client refines configuration rather than designing an engine from a blank page. |
| Unknown programme rules | Exact criteria, weights, role labels, document limits, templates, and authority do not block engine development. They remain draft configuration until production publication/G3 acceptance. |
| Scope control | The first release is a configurable SME Fund workflow engine, not a general-purpose BPM suite, arbitrary script host, or unrestricted page/form builder. |
| Reuse | Shared portal, navigation, permission, status, table, form, upload, workflow, and task-frame components are composed and varied rather than copied. |
| Data access | Read models use explicit SQL-level projection, database filtering/aggregation/pagination, reviewed indexes, and no N+1 or sequential independent queries. |

### Applicant portal information architecture

The applicant navigation contains:

- Dashboard.
- Funding Opportunities, linked to the public funding-call catalogue rather
  than duplicated portal content.
- My Applications.
- Notifications.
- My Profile.

Help and Support and Logout are footer actions. Reviewer information requests
and applicant responses remain contextual to an application; they are not a
generic Messages sidebar route.

The application workspace keeps stable sections regardless of the internal
workflow configuration:

```text
Overview | Documents | Status | Information Requests
```

The primary screen surfaces the next applicant action, autosave/connectivity
state, the applicant-safe status timeline, and recent communication. After
submission, the submitted form, declaration, and original evidence are
read-only. Additional evidence is appended only through an information request
or another explicitly authorised upload action.

Applicant pages must cover loading, empty, recoverable error, offline/retry,
conflicting/stale draft, upload/scan, session-expiry, success, conditional
eligibility, and action-required states. Mobile status, form, upload, and
information-response journeys are first-class acceptance targets.

### Operations portal information architecture

The operations navigation contains only routes allowed by the current user's
capabilities:

- Dashboard.
- Work Queue.
- Applications.
- Information Requests.
- Reports.
- Users & Access.
- Audit Log.

Help and Support and Logout are footer actions. Workflow Configuration is a
capability-gated administrative workspace. Funding Opportunity–Workflow
Assignment is one state within that workspace and is never another sidebar
route.

Screening, technical assessment, finance review, recommendation, and decision
are configurable work-queue filters and saved views rather than permanent
sidebar modules. The application workspace keeps stable contextual sections:

```text
Overview | Applicant | Documents | Assessment | Finance Review | Recommendation | Decision | History
```

The task-specific workspace section renders the active registered task UI. The Work Queue
projection shows task name/type, application reference and applicant summary,
stage, priority, role/user assignment, status, and due date without loading the
full application or task payload.

Workflow Configuration provides draft creation/cloning, ordered stages and
tasks, role/user assignment rules, applicant-visible labels, allowed actions
and transitions, type-specific configuration, validation, plain-language
preview, publish, and retire. Published versions cannot be edited or deleted.

The Applications and Information Requests areas provide capability-gated
selection, bulk status action, batch communication, and explicit export
projections. The user/access area manages application-owned roles and
capabilities; it does not delegate platform authorization to Payload.

### Agreed portal architecture

Phase 3 is one authenticated portal system inside the single `apps/platform`
application. It is not two applications or two independently implemented portal
codebases. It retains two semantic route spaces:

- `/portal` owns applicant self-service routes.
- `/admin` owns internal operations routes.
- `/cms` remains the separately owned Payload content-administration surface.

The applicant and operations route spaces share an authenticated portal shell,
navigation primitives, responsive behaviour, user menu, status components,
permission context, and capability-gate component. Their route catalogues and
page content differ because their information architecture and data exposure
are materially different.

Sidebar items are filtered from the resolved capability set. An applicant sees
applicant routes; an authorised staff user sees operational routes; a user who
legitimately holds both sets can switch between Applicant and Operations. A
default post-login route is selected from capabilities rather than a hard-coded
role name.

The sidebar filter is a usability feature only. The matching layout/page guard,
API or Server Action, backend service, repository projection, and document
adapter must independently enforce access on the server.

### Permission-driven UI pattern

The implementation will adapt the proven WorkflowHub pattern:

- A typed route catalogue declares `requiredCapability`,
  `requiredAnyCapabilities`, or `requiredAllCapabilities`.
- Recursive filtering removes inaccessible child routes and then empty parent
  sections.
- A reusable `CapabilityGate` supports one, any, or all capabilities; hide or
  forbidden modes; loading and explicit fallback states; and optional resource
  ownership/scope context.
- The same gate is used for whole-page boundaries and individual actions such
  as assign, export, override, approve, or publish.
- Capability constants are centralised; components never compare human-facing
  role labels.

Unlike a client flow that fetches the session and then fetches grants in a
second request, the portal layout will resolve the application user, roles, and
capabilities through one explicit SQL projection and hydrate a shared client
permission context. Refreshing permissions may use one dedicated query, but
navigation rendering must not create a request waterfall.

### Phase 3 visual direction

The Phase 3 implementation targets are the complete screen boards below. The
numbered screen references in the incremental delivery table refer to these
boards:

- `apps/platform/public/mockups/phase-3/applicant-portal-all-screens-desktop-v1.png`
- `apps/platform/public/mockups/phase-3/applicant-portal-all-screens-mobile-v1.png`
- `apps/platform/public/mockups/phase-3/admin-portal-all-screens-desktop-v1.png`
- `apps/platform/public/mockups/phase-3/admin-portal-all-screens-mobile-v1.png`

Each increment must implement both the desktop and mobile target for every
screen assigned to it. The boards define the intended information hierarchy,
navigation, fields, actions, responsive composition, and workflow presentation;
implementation still applies the canonical accessible design tokens below.

- Use the SME Fund logo, not the ProSME logo, throughout the applicant and
  operations portal shell.
- Use the canonical `brand-orange` portal sidebar with `brand-navy` text and
  icons. The active item uses a `brand-navy` surface with white text.
- Use the canonical `brand-white`, `brand-cream`, `brand-yellow`, `brand-blue`,
  `brand-navy`, `brand-gold`, `brand-green`, and `brand-orange` tokens. Phase 3
  components must not use generic orange Tailwind colours, legacy orange
  compatibility aliases, or hard-coded orange hex values.
- Treat `brand-orange` as the primary colour. Primary calls to action use a
  `brand-orange` surface with `brand-navy` text and icons.
- Standalone brand, feature, navigation, and action icons use `brand-orange`.
  Icons use `brand-navy` when placed on a `brand-orange` surface so they remain
  visible. Success, warning, and error icons may use their approved semantic
  token only when colour communicates that state and a text cue is also shown.
- Do not solve contrast by darkening the SME Fund orange. Use navy for text,
  icons, links, and focus indicators on white, cream, yellow, and orange
  surfaces. Use white, orange, yellow, or blue only where their contrast against
  the background is verified.
- Error, warning, success, information, draft, pending, and disabled states use
  dedicated semantic tokens mapped to accessible application-palette
  combinations. Workflow status must never overload orange as an error colour.
- Use the same shell components for desktop and mobile; mobile uses a compact
  header and labelled bottom navigation or drawer as appropriate.
- Preserve text and icon status cues, visible keyboard focus, minimum touch
  targets, responsive forms/tables, and low-bandwidth behaviour.
- Internal workflow details, comments, scores, assignments, recommendations,
  and panel deliberations are never exposed through applicant components.

### Configurable workflow design

```text
WorkflowDefinition
└── WorkflowDefinitionVersion
    ├── WorkflowStageDefinition
    │   └── StageTaskDefinition
    └── WorkflowTransitionDefinition

Application
└── WorkflowInstance -> exact published definition version
    └── WorkflowStageInstance
        └── StageTaskInstance
```

Published definition versions are immutable. A change creates a new draft
version, and existing applications continue using the version pinned at
submission. Workflow, audit, and notification-outbox events record runtime
changes without rewriting history.

The initial controlled task-type registry is:

```text
AUTOMATED_RULE_CHECK
CHECKLIST
DOCUMENT_REVIEW
STRUCTURED_FORM
ASSESSMENT_FORM
FINANCE_REVIEW
INFORMATION_REQUEST
RECOMMENDATION
DECISION
COMMUNICATION
```

Administrators may create, order, configure, and assign any number of tasks
using registered task types without a deployment. `STRUCTURED_FORM` supports a
bounded set of common fields for future review forms. A genuinely new UI or
automated behaviour is introduced through a typed registry entry containing its
configuration schema, result schema, renderer, service handler, capability
rules, and tests; database configuration may never load arbitrary code.

A stage provides a default assignee role. A task may override it with another
role or a named user. Direct user assignment takes precedence, but assignment
does not replace capability authorization. Role tasks are claimed atomically.

The first draft reference workflow is Submission and automated pre-screening,
Completeness Screening, Technical Assessment, Finance Review, Committee
Decision, and Outcome Communication. It is a client-assistance starting point,
not hard-coded programme policy. Unknown criteria, weights, document rules,
templates, and assignments remain editable draft configuration.

### Engineering quality constraints

#### Component and code reuse

- Search for and extend an existing primitive before creating a component,
  hook, schema, mapper, constant, or service.
- Shared authenticated shell, sidebar, route filtering, capability gates, page
  headers, data tables, status badges, timelines, empty/loading/error states,
  upload controls, task frames, and form fields have one implementation with
  variants and composition.
- Applicant and operations pages may compose the same primitive differently;
  they must not copy it into feature folders.
- UI repeated twice is reviewed for extraction; UI repeated three times is
  extracted unless behaviour is materially different.
- Task renderers share a common task-frame contract and common save, validation,
  comments, assignment, history, and action components.
- Route pages remain composition-only and comply with the repository file and
  function-size gates.

#### SQL-level projection and query discipline

- Repositories return purpose-built read models such as `WorkQueueRow`,
  `ApplicationSummary`, `ApplicationWorkspace`, and `ApplicantStatusView`.
- Every read selects explicit required columns. Broad entity/table selection
  followed by in-memory omission or remapping is not accepted.
- Filtering, ownership, authorization scope, sorting, pagination, counts, and
  aggregates are executed in PostgreSQL.
- Related list data uses joins, lateral joins, CTEs, window functions, or JSON
  aggregation where appropriate; repository code must not issue queries inside
  a record loop.
- Independent reads use one composed SQL statement where practical, otherwise
  they execute concurrently. Sequential independent queries and client/API
  request waterfalls are prohibited.
- Dependent writes may be sequential only inside one transaction when an
  earlier generated identifier or locked state is required. Collections use
  bulk inserts/updates rather than per-row commands.
- List endpoints return projections and page metadata from bounded queries;
  they do not load full applications, documents, audit history, or task payloads.
- Work-queue, application-list, status-timeline, and assignment queries require
  reviewed indexes and recorded `EXPLAIN` evidence using representative test
  volumes before their increment is accepted.
- Tests must detect ownership leaks, over-projection of sensitive fields,
  N+1/query-in-loop behaviour, unstable pagination, and duplicate command
  execution.

### Incremental Phase 3 delivery plan

Phase 3 is delivered and reviewed in the following increments. Every increment
has a formal gate record. An increment is complete only when its gate record is
marked **Accepted** by the named review authority. Work on `P3.n+1` must not
begin while the `P3.n` gate is Not started, In progress, Ready for review,
Rejected, or otherwise unaccepted. Mocked later screens do not satisfy or
bypass an earlier gate.

| Increment | Scope | Target screens | Gate record | State | Exit evidence |
| --- | --- | --- | --- | --- | --- |
| P3.0 Design, contracts and visual targets | Portal IA, accessible colour-token contract, shared shell contract, capability catalogue, workflow model, task registry, status vocabulary, SQL read models, API contracts, and complete desktop/mobile visual targets | Complete UI boards | `docs/testing/gates/P3.0-design-contracts.md` | Complete | Accepted gate record and four complete Phase 3 target boards |
| P3.1 Identity, profiles and shared portal shell | Shared authenticated portal shell, capability context/gates, applicant profile, owned business collection, and ownership policy | Applicant Dashboard, My Profile, and My Businesses | `docs/testing/gates/P3.1-identity-profiles.md` | Complete | Accepted implementation and verification evidence |
| P3.2.1 Source ownership and service boundaries | Audience-owned applicant/admin/public component paths, domain-owned modules, explicit `Client<Domain>Service.ts` and `Server<Domain>Service.ts` names, and audience-owned API routes | Source architecture only | `docs/testing/gates/P3.2.1-structure-boundaries.md` | Accepted | Automated structural tests, architecture and file gates, imports, tests, and production build |
| P3.2 Funding opportunities, eligibility and application drafts | Funding-call linkage, versioned eligibility rules/results, application creation, draft/save/resume, form validation, and application section completion without submission | Applicant screens 2–9 | `docs/testing/gates/P3.2-funding-eligibility-drafts.md` | In progress — funding opportunities implemented | Funding-call projection, applicant-owned draft round trip, validation, and rule-version tests after P3.2.1 acceptance |
| P3.3 Workflow configuration and opportunity assignment | Definition/version/stage/task/transition persistence, typed task registry, TOR-aligned seed workflow, draft/clone/validate/preview/publish/retire lifecycle, published-version immutability, and funding-opportunity assignment | Workflow Definitions, Workflow Editor, and Funding Opportunity–Workflow Assignment within Workflow Configuration | `docs/testing/gates/P3.3-workflow-configuration.md` | Not started | Migration, definition-validation, registry, immutable-version, publication, authorization, audit, assignment, and projection/query evidence |
| P3.4 Documents, declarations and submission | Private storage adapter, document metadata and scan states, declarations, review, idempotent submission/reference, and transactional creation of the initial workflow instance from the opportunity's assigned published workflow version | Applicant screens 10–13 | `docs/testing/gates/P3.4-documents-submission.md` | Not started | Transaction, assignment/version-pinning, duplicate-submit, access, declaration, and upload tests |
| P3.5 Work queue, screening and information requests | Task projection, assignment/claim, completeness and document-review tasks, and the information request/response loop | Admin screens 2 and 4–9; Applicant screen 14 | `docs/testing/gates/P3.5-work-queue-screening.md` | Not started | Queue query plan, capability and assignment tests, screening transitions, and end-to-end request loop |
| P3.6 Assessment, finance and recommendations | Type-driven assessment and finance tasks, scoring configuration, comments, recommendations, and return paths | Admin screens 10–12 | `docs/testing/gates/P3.6-assessment-finance.md` | Not started | Versioned configuration/result, capability, scoring, and transition tests |
| P3.7 Decision and outcome communication | Panel decision, reasoned override, conditions, outcome templates, notification outbox, delivery states, applicant-safe status, and notifications | Admin screens 13–14; Applicant Notifications and Status | `docs/testing/gates/P3.7-decision-communication.md` | Not started | Authority, override, audit, outbox, delivery-idempotency, and happy-path evidence |
| P3.8 Users, access, reports, audit and bulk operations | User/role/capability management, reports, audited CSV/Excel export, bulk status, batch communication, audit log, and remaining workflow-administration operations | Admin screens 3 and 15–20 | `docs/testing/gates/P3.8-administration-reporting.md` | Not started | Permission matrix, export projection, audit, reporting, and bulk transaction tests |
| P3.9 Full G3 acceptance | Full responsive, accessibility, security, performance, recovery, and UAT journeys | All desktop/mobile journeys | `docs/testing/gates/G3-application-workflow.md` | Not started | Completed G3 gate record and written milestone acceptance |

P3.2 does not depend on a configured workflow. Applicants may discover funding
opportunities, assess eligibility, create applications, save, resume, and
complete drafts before a workflow is assigned.

P3.3 implements the workflow-definition system and allows an authorised
administrator to assign a published workflow version to a funding opportunity.
Funding Opportunity–Workflow Assignment is a state within Workflow
Configuration, not a separate sidebar route and not an additional visual-board
deliverable.

Only submission depends on workflow assignment. P3.4 must reject submission
unless the selected funding opportunity has an assigned published,
immutable `WorkflowDefinitionVersion`. A successful submission pins that exact
version and atomically creates the application reference, workflow instance,
initial stage, initial tasks, workflow event, audit event, and required
notification-outbox records. It must never assemble stages or tasks from
hard-coded application logic.

### Entry conditions

- G1 passed.
- A configurable, TOR-aligned reference workflow and role/capability proposal
  are available as draft configuration.
- Unconfirmed eligibility, scoring, authority, document, and communication
  rules are recorded as draft assumptions rather than embedded in code.
- Development and testing may proceed with synthetic draft configuration.
  Production publication and G3 acceptance require programme approval of the
  active configuration; affected decision actions remain explicitly disabled
  until their authority is approved.

### Required work

1. Integrate the existing application into the platform domain and PostgreSQL
   persistence model.
2. Implement applicant registration, profile, business profile, and identity
   linking.
3. Link portal funding opportunities to the public funding-call catalogue
   without duplicating CMS-owned content.
4. Implement eligibility assessments with configurable rules and recorded rule
   versions.
5. Implement applicant-owned application creation, draft/save/resume,
   validation, and application-section completion without requiring a workflow.
6. Implement the workflow-definition schema, migrations, repositories,
   services, lifecycle, validation, typed task registry, and TOR-aligned seed
   workflow before implementing submission or work-queue behaviour.
7. Allow an authorised administrator to assign a published workflow version to
   a funding opportunity within Workflow Configuration. Do not create a
   separate sidebar route for the assignment state.
8. Implement secure document upload, metadata, access control, validation, and
   the malware-scanning integration point.
9. Implement application review, declarations, idempotent submission, and
   immutable reference generation. Submission, but not draft work, requires the
   selected opportunity to have an assigned published workflow version.
10. On submission, atomically create the workflow, stage, and task instances
    from the exact assigned published workflow-definition version pinned to the
    application.
11. Implement applicant-safe status tracking, notifications, information
    requests, and additional-document responses without a generic Messages
    route.
12. Implement internal completeness screening, assignment, technical
    assessment, scoring, finance review, recommendation, decision, and
    controlled outcome communication.
13. Implement manual override only for authorised capabilities and require a
    reason.
14. Create immutable workflow and audit events for sensitive state changes.
15. Implement CSV/Excel export with authorization and audit logging.
16. Prevent duplicate submissions and make critical commands idempotent.
17. Use PostgreSQL transactions for submission and workflow transitions.
18. Add granular operational permissions for applications, assessment,
    finance, decisions, communication, exports, and overrides.
19. Add application-owned user and role management under `/admin`, including
    verified-user promotion or staff invitation; do not administer permissions
    in Payload.
20. Allow only authorised administrators to assign roles to verified users,
    treating each role as the permission group rather than adding a duplicate
    grouping model.
21. Record immutable audit events for every role, permission, and
    application-user status change.

### Gate G3 — M5 workflow accepted

**Acceptance authority:** Programme owner, finance representative, and technical lead  
**Required evidence:** `docs/testing/gates/G3-application-workflow.md`

G3 passes only when:

- A new applicant can register, verify their email, complete a profile, assess eligibility, save a draft, resume, upload approved documents, review, declare, and submit.
- Submission generates one unique immutable reference and atomically creates one
  workflow instance pinned to the exact approved published definition version,
  with its initial stage, tasks, and workflow event.
- Refreshing or repeating a submission request cannot create duplicate applications.
- Applicant users can access only their own business, applications, documents, messages, and notifications.
- Internal roles can perform only their explicitly granted capabilities.
- The approved happy path completes from submission through decision communication.
- Incomplete-application and information-request paths complete end to end.
- Manual overrides record actor, timestamp, previous value, new value, and reason.
- Every status transition is validated server-side and recorded in the audit trail.
- Document access is private, authorised, logged, and protected from direct identifier guessing.
- Export functions exclude fields not authorised for the requesting role.
- Browser storage is not the system of record.
- Authorization, workflow-transition, transaction, and ownership-isolation tests pass.

## Phase 4 — AI chatbot and assisted support

**Milestone:** M6  
**Gate:** G4

### Entry conditions

- G2 passed.
- Approved knowledge sources and FAQ content are published.
- AI provider, data-processing terms, retention policy, and escalation contact are approved.

### Required work

1. Implement the chatbot through a server-side Next.js endpoint and provider adapter.
2. Restrict retrieval to approved, published SME Fund knowledge sources.
3. Return source references where applicable.
4. Prevent unauthenticated access to applicant records or internal workflow data.
5. Implement fallback and human escalation to the approved support channel.
6. Log unresolved questions and privacy-safe usage metrics.
7. Add prompt-injection, data-exfiltration, abusive-use, and rate-limit controls.
8. Create a repeatable programme-specific evaluation set.

### Gate G4 — M6 chatbot accepted

**Acceptance authority:** Programme content owner and technical lead  
**Required evidence:** `docs/testing/gates/G4-chatbot.md`

G4 passes only when:

- All critical test questions about eligibility, documents, funding limits, application status, and deadlines return approved answers or an explicit “I do not know” response.
- Closed calls are never presented as open.
- The chatbot does not invent eligibility approval, application decisions, dates, amounts, or policy.
- Unresolved questions can be escalated and are visible to authorised staff.
- Prompt-injection tests cannot expose secrets, unpublished content, other users’ data, or system instructions.
- Rate limits and abuse controls operate as configured.
- Interaction analytics contain no prohibited personal or application data.
- The approved evaluation report contains no unresolved critical or high-severity result.

## Phase 5 — Analytics and reporting

**Milestone:** M7  
**Gate:** G5

### Entry conditions

- G2 passed.
- Analytics owner, consent rules, tracked events, recipients, and reporting cadence are approved.

### Required work

1. Configure GA4 or the approved equivalent for public traffic.
2. Implement consent-aware page and campaign tracking.
3. Track the eligibility and application funnel without sending personal or sensitive data to third-party analytics.
4. Implement operational dashboards from PostgreSQL application data.
5. Implement sector, region, status, beneficiary, and application statistics.
6. Configure bi-weekly and monthly report generation and delivery.
7. Implement authorised exports and chart/report reproducibility.

### Gate G5 — M7 analytics accepted

**Acceptance authority:** Analytics owner, programme owner, and privacy owner  
**Required evidence:** `docs/testing/gates/G5-analytics.md`

G5 passes only when:

- The approved event catalogue is implemented and test events are visible in the target analytics property.
- Consent choices are respected.
- No applicant name, email, phone number, document reference, free text, or application content is transmitted to public analytics.
- Dashboard totals reconcile with controlled PostgreSQL queries using the same fixtures or snapshot.
- Filters and exports produce reproducible results.
- Scheduled reports reach only approved recipients.
- Public programme statistics expose only approved aggregate data.

## Phase 6 — Quality assurance and user acceptance

**Milestone:** M8  
**Gate:** G6

### Entry conditions

- G2–G5 passed or have documented client-approved exceptions.
- Staging/UAT environment is stable and versioned.
- UAT participants and test schedule are confirmed.

### Required work

1. Execute functional, integration, migration, security, accessibility, compatibility, performance, and recovery tests.
2. Execute end-to-end tests for Applicant, Administrator, Editor, Author, Reviewer, Programme Officer, Sector Specialist, Approval Panel Member, and System Administrator roles.
3. Test current supported Chrome, Firefox, Safari, Edge, Android, and iOS browser profiles agreed with the client.
4. Test constrained-width and constrained-network behaviour.
5. Conduct UAT with named client representatives.
6. Record every test case, result, defect, resolution, retest, and acceptance decision.

### Defect severity

| Severity | Definition | Gate treatment |
| --- | --- | --- |
| S0 — Critical | Data breach, data corruption, privilege escalation, total outage, or irreversible loss | Blocks release and gate |
| S1 — High | Core journey unavailable, incorrect decision/status, inaccessible critical path, or major security defect | Blocks release and gate |
| S2 — Medium | Material degradation with a safe workaround | Requires fix or written client acceptance with target date |
| S3 — Low | Cosmetic or minor usability issue | May enter controlled backlog |

### Gate G6 — M8 UAT accepted

**Acceptance authority:** Named client UAT authority  
**Required evidence:** `docs/testing/uat/UAT-REPORT.md`

G6 passes only when:

- The approved test plan has been fully executed.
- All S0 and S1 defects are closed and retested.
- Every remaining S2 defect has written client acceptance, owner, and resolution date.
- Critical applicant and internal workflow journeys pass on the agreed browser/device matrix.
- Accessibility review has no unresolved critical-path WCAG 2.2 AA failure.
- Security testing has no unresolved critical or high-severity finding.
- Backup restoration and rollback procedures have been successfully rehearsed.
- The client signs the UAT report.

## Phase 7 — Training, documentation and handover

**Milestones:** M9, M10, M11  
**Gate:** G7

### Entry conditions

- G6 passed.
- Training participants and handover recipients are confirmed.
- Release candidate matches the accepted UAT version except for approved release fixes.

### Required work

1. Deliver at least two structured training sessions.
2. Deliver technical/administrative training for the designated NIPDB IT staff.
3. Deliver CMS and operational-user training for designated content and programme users.
4. Provide administrator, CMS editor, applicant-support, operational-user, and technical manuals.
5. Provide architecture, data model, API, integration, migration, deployment, backup, recovery, monitoring, and troubleshooting documentation.
6. Provide source repositories, design assets, dependency inventory, licences, environment-variable catalogue, access inventory, and credential-transfer record.
7. Transfer credentials through an approved secure channel, never through repository files or training documents.
8. Record known limitations, accepted defects, support contacts, and escalation procedures.

### Gate G7 — M9–M11 handover accepted

**Acceptance authority:** Client IT owner and client project authority  
**Required evidence:** `docs/handover/HANDOVER-ACCEPTANCE.md`

G7 passes only when:

- Minimum training attendance requirements are met and attendance is recorded.
- Training exercises demonstrate that authorised staff can perform their expected tasks.
- All required manuals are delivered and match the release candidate.
- A new authorised technical operator can deploy the documented release using the handover instructions.
- A content editor can update and publish approved content without developer assistance.
- Client-owned access to source code, Firebase, database, hosting, storage, analytics, domain/DNS, monitoring, and communication systems is verified.
- The client confirms receipt of source code, intellectual property, assets, documentation, and access inventory.
- The handover acceptance record is signed.

## Phase 8 — Production launch

**Supports:** Operational acceptance and start of M12  
**Gate:** G8

### Entry conditions

- G6 and G7 passed.
- Client GCP access and approved production architecture are available.
- Production Firebase project is client-owned and configured.
- Domain, DNS, TLS certificate, storage, database, monitoring, and notification integrations are ready.

### Required work

1. Provision or validate isolated production services.
2. Apply production migrations through the approved process.
3. Load approved content and configuration.
4. Configure `www.smefund.na`, HTTPS, redirects, security headers, and approved analytics.
5. Configure backups, monitoring, alerting, log retention, and operational access.
6. Execute smoke, authorization, upload, notification, chatbot, analytics, and recovery checks.
7. Record the release version, database version, configuration version, and rollback point.

### Gate G8 — Go-live authorised

**Acceptance authority:** Client go-live authority, client IT owner, and technical lead  
**Required evidence:** `docs/handover/GO-LIVE-CHECKLIST.md`

G8 passes only when:

- All production prerequisites are verified against actual production services.
- Production uses client-owned accounts and credentials.
- HTTPS is valid and forced across the site.
- Production authorization smoke tests pass for applicant and each internal role.
- Backup, restoration, monitoring, alerting, and rollback evidence is current.
- No S0 or S1 defect is open.
- No unapproved test account, placeholder content, mock workflow, or simulated integration remains enabled.
- The client gives written go-live approval.

If GCP access or another production prerequisite is unavailable, G8 remains failed or not ready. The system must not be described as launched solely because it runs locally or in a temporary environment.

## Phase 9 — Thirty-day post-launch support

**Milestone:** M12  
**Gate:** G9

### Entry conditions

- G8 passed.
- Production launch timestamp is recorded.
- Support contacts, hours, severity definitions, and escalation route are communicated.

### Required work

1. Provide first-, second-, and third-level support coordination.
2. Monitor availability, errors, security events, dependencies, jobs, notifications, and storage.
3. Resolve launch defects and agreed minor adjustments.
4. Maintain a support register with timestamps, severity, owner, resolution, and root cause where applicable.
5. Provide operational and maintenance reports.

### Gate G9 — M12 support closed

**Acceptance authority:** Client service owner  
**Required evidence:** `docs/support/30-DAY-SUPPORT-CLOSURE.md`

G9 passes only when:

- Thirty calendar days have elapsed from the recorded production launch.
- All S0 and S1 support incidents are closed.
- Remaining items have agreed owners and disposition.
- Support and maintenance reports are delivered.
- Knowledge-base and operational documentation reflect resolved incidents.
- The client accepts closure of the included support period.

## 9. Cross-cutting controls

### 9.1 Security

- Verify every protected action on the server.
- Deny access by default.
- Use least-privilege capabilities.
- Encrypt all network traffic.
- Keep Firebase Admin, database, storage, AI, email, and analytics secrets server-only.
- Validate upload type, extension, signature, size, and scan status.
- Rate-limit authentication, contact, subscription, upload, export, and chatbot endpoints.
- Record sensitive administrative and workflow actions in immutable audit events.
- Test horizontal and vertical privilege escalation.

### 9.2 Privacy

- Collect only required applicant data.
- Record privacy notice and declaration versions accepted by the applicant.
- Do not send personal application data to public analytics or the chatbot.
- Define retention and deletion rules before production launch.
- Restrict exports and log their creation and download.
- Maintain a record of processing activities before G8.

### 9.3 Accessibility

- Target WCAG 2.2 AA.
- Support keyboard-only operation.
- Provide visible focus, programmatic labels, meaningful errors, and status announcements.
- Do not use colour as the only status indicator.
- Test zoom, reflow, reduced motion, and screen-reader-critical journeys.

### 9.4 Performance and low bandwidth

- Render public content server-side by default.
- Minimise client JavaScript.
- Optimise and responsively serve images.
- Avoid autoplay media and unnecessary third-party scripts.
- Define and record agreed performance budgets before G2 review.
- Test the primary public and applicant journeys using an agreed constrained-network profile.

### 9.5 Data and audit integrity

- Use transactions for multi-record workflow changes.
- Use idempotency for submission, notifications, and externally retried operations.
- Make application references unique and immutable.
- Record actor, action, target, timestamp, previous state, new state, and reason for sensitive changes.
- Never silently alter submitted applicant declarations or original documents.

## 10. Required gate evidence structure

```text
docs/
├── testing/
│   ├── gates/
│   │   ├── G1-foundation.md
│   │   ├── G2-public-website.md
│   │   ├── G3-application-workflow.md
│   │   ├── G4-chatbot.md
│   │   └── G5-analytics.md
│   └── uat/
│       ├── UAT-PLAN.md
│       ├── UAT-CASES.md
│       └── UAT-REPORT.md
├── training/
│   ├── TRAINING-PLAN.md
│   ├── ATTENDANCE.md
│   └── MATERIALS.md
├── handover/
│   ├── HANDOVER-CHECKLIST.md
│   ├── HANDOVER-ACCEPTANCE.md
│   └── GO-LIVE-CHECKLIST.md
└── support/
    ├── SUPPORT-REGISTER.md
    └── 30-DAY-SUPPORT-CLOSURE.md
```

Each gate record must include:

- Gate identifier and version tested.
- Date and environment.
- Checklist result for every criterion.
- Evidence links.
- Open defect list.
- Exceptions and approvals.
- Reviewer names.
- Final state and written acceptance.

## 11. Delivery roles

| Role | Accountability |
| --- | --- |
| Client project authority | Scope, milestone, exception, UAT, handover, and launch acceptance |
| Client content owner | Public content, FAQs, dates, terminology, resources, and chatbot knowledge approval |
| Client programme owner | Eligibility, workflow, scoring, decisions, communications, and reporting approval |
| Client IT owner | Identity, hosting, security, access, operations, handover, and recovery acceptance |
| Privacy owner | Consent, analytics, retention, processing, and data-sharing approval |
| Technical lead | Architecture, implementation quality, migrations, security controls, evidence, and release readiness |
| Delivery team | Implementation, automated tests, documentation, defect resolution, and demonstrations |

One person may hold multiple roles, but each gate must identify the actual individual accepting it.

## 12. Change control

A change request is required when a proposed change affects:

- Contract scope or milestone acceptance.
- Eligibility or scoring outcomes.
- Roles, capabilities, or approval authority.
- Applicant data collection or retention.
- External integrations or data sharing.
- Hosting or security architecture.
- Approved visual identity or content hierarchy.
- Delivery dates or gate criteria.

Each change request must document scope, reason, affected requirements, schedule impact, security/privacy impact, implementation owner, test impact, and approving authority.

## 13. Immediate execution order

1. Preserve the completed G1 foundation and accepted G2 public website.
2. Preserve the accepted P3.0 contracts and trace later changes through their
   acceptance record.
3. Preserve accepted P3.1 identity, profiles, shared authenticated shell,
   typed route filtering, and capability gates.
4. Accept P3.2.1 source ownership and explicit client/server service
   boundaries before adding more Phase 3 feature code.
5. Deliver P3.2 funding opportunities, eligibility, and application drafts;
   record its evidence. Draft work does not require a configured workflow.
6. Deliver P3.3 workflow configuration, publication, and funding-opportunity
   assignment; record its evidence.
7. Deliver P3.4 documents, declarations, idempotent submission, and
   transactional workflow instantiation from the opportunity's assigned
   published version; record its evidence.
8. Deliver P3.5 work queue, screening, and the information-request round trip;
   record its evidence.
9. Deliver P3.6 assessment, finance, and recommendations; record its evidence.
10. Deliver P3.7 decision and outcome communication; record its evidence.
11. Deliver P3.8 users, access, reports, audit, and bulk operations; record its
    evidence.
12. Execute P3.9 and pass G3 only after all earlier Phase 3 evidence is accepted.
13. Deliver M6 and M7, then pass G4 and G5.
14. Execute UAT and pass G6.
15. Complete training, documentation, and handover; pass G7.
16. Provision the approved GCP production environment and pass G8.
17. Complete the 30-day support period and pass G9.

## 14. Completion condition

The project is complete only when G9 has passed. Passing a demonstration, deploying to a temporary URL, or completing development does not constitute contractual completion without UAT acceptance, handover, authorised production launch, and closure of the post-launch support period.
