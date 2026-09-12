# SME Fund Platform — Gated Implementation Plan

## Document control

| Field | Value |
| --- | --- |
| Document | Production implementation and delivery plan |
| Version | 1.0 |
| Date | 11 September 2026 |
| Status | Execution baseline; gate acceptance must be recorded during delivery |
| Product | SME Fund platform under the ProSME Project |
| Selected design | Option B |
| Delivery scope | Remaining milestones M4–M12 |

This document is the authoritative implementation plan for production delivery after selection of Option B. The root-level `IMPLEMENTATION_PLAN.md` remains only as a record of the initial demonstrator.

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
| M4 | Fully Developed and Operational Website | Week 3 | In delivery |
| M5 | Online Application System with Workflow Engine | Week 3 | Existing component; integration and acceptance pending |
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
**Status:** In progress — local foundation implemented; real-Firebase evidence and technical-lead acceptance pending

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

### Entry conditions

- G1 passed.
- Role/capability matrix is approved.
- Eligibility rules and hard/conditional criteria are approved.
- Screening, assessment, finance, and decision stages are approved.
- Scoring rubric and approval authority are approved or the affected decision action remains explicitly disabled.
- Document categories, accepted formats, and size limits are approved.

### Required work

1. Integrate the existing application into the platform domain and PostgreSQL persistence model.
2. Implement applicant registration, profile, business profile, and identity linking.
3. Implement eligibility assessments with configurable rules and recorded rule versions.
4. Implement application draft, save/resume, validation, review, declaration, submission, and reference generation.
5. Implement secure document upload, metadata, access control, validation, and malware-scanning integration point.
6. Implement applicant status tracking, messages, notifications, information requests, and additional-document responses.
7. Implement internal completeness screening, assignment, technical assessment, scoring, finance review, recommendation, decision, and controlled communication.
8. Implement manual override only for authorised capabilities and require a reason.
9. Create immutable workflow and audit events for sensitive state changes.
10. Implement CSV/Excel export with authorization and audit logging.
11. Prevent duplicate submissions and make critical commands idempotent.
12. Use PostgreSQL transactions for submission and workflow transitions.
13. Add granular operational permissions for applications, assessment, finance, decisions, communication, exports, and overrides.
14. Add application-owned user and role management under `/admin`, including verified-user promotion or staff invitation; do not administer permissions in Payload.
15. Allow only authorised administrators to assign roles to verified users, treating each role as the permission group rather than adding a duplicate grouping model.
16. Record immutable audit events for every role, permission, and application-user status change.

### Gate G3 — M5 workflow accepted

**Acceptance authority:** Programme owner, finance representative, and technical lead  
**Required evidence:** `docs/testing/gates/G3-application-workflow.md`

G3 passes only when:

- A new applicant can register, verify their email, complete a profile, assess eligibility, save a draft, resume, upload approved documents, review, declare, and submit.
- Submission generates one unique immutable reference and one initial workflow event.
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

1. Obtain and inventory the existing application and Payload CMS source.
2. Promote Option B into `apps/platform` and archive inactive design concepts.
3. Establish real Firebase development authentication and PostgreSQL connectivity.
4. Implement the application-user and capability model.
5. Integrate Payload at `/cms` with Firebase identity and no local passwords.
6. Establish migrations, CI checks, logging, health checks, and gate evidence templates.
7. Pass G1.
8. Deliver M4 and pass G2.
9. Integrate and complete M5, then pass G3.
10. Deliver M6 and M7, then pass G4 and G5.
11. Execute UAT and pass G6.
12. Complete training, documentation, and handover; pass G7.
13. Provision the approved GCP production environment and pass G8.
14. Complete the 30-day support period and pass G9.

## 14. Completion condition

The project is complete only when G9 has passed. Passing a demonstration, deploying to a temporary URL, or completing development does not constitute contractual completion without UAT acceptance, handover, authorised production launch, and closure of the post-launch support period.
