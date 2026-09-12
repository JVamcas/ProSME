# Phase 2 CMS capability matrix

## Authorization boundary

Firebase authenticates the user. PostgreSQL owns role and capability assignments. Payload receives the resolved capability codes through the shared Firebase session and does not store passwords, roles, or permission policy.

`cms.access` permits entry to `/cms`; it does not grant access to any collection or global. Every protected Payload operation also requires its resource-specific capability. Published public content remains publicly readable.

## Capability format

CMS capabilities use `cms.<resource>.<action>`.

| Resource | Actions enforced |
| --- | --- |
| Pages, News, Resources, Events, FAQs | read, create, update, publish, delete |
| Funding Calls, Eligibility, Statistics | read, create, update, publish, delete |
| Media | read, create, update, delete |
| Site Settings (Header, Footer, Homepage, Contact Details, Site Settings) | read, update, publish |
| Engagement Submissions (contact and newsletter) | read, update, delete |

`cms.audit.read` controls content-audit visibility. `cms.principals.manage` is assigned only to system administrators and makes the read-only principal mirror visible. Payload cannot create, update, or delete principals and contains no role or capability editor.

## Standard role matrix

| Role | Granted CMS scope |
| --- | --- |
| CMS Editor | Create and update editorial collections; update site settings; manage media except deletion; cannot approve or publish |
| CMS Publisher | Editor scope plus approval/publishing for editorial collections and site settings; can read the content audit |
| Programme Administrator | Full Funding Calls, Eligibility, and Statistics management; engagement-submission management; media management; can read the content audit and enter `/admin` |
| System Administrator | Every Phase 2 CMS capability, principal-mirror visibility, content-audit visibility, and `/admin` access |

The role is the permission group. No second permission-group model is introduced.

## Enforcement rules

- Collection/global access controls enforce read and mutation permissions in Payload APIs and drive Payload Admin visibility.
- Publishing hooks require the matching resource publish capability and an approved review state.
- Draft-mode public rendering rechecks the matching resource read capability server-side; a preview cookie alone cannot expose another resource's drafts.
- Application routes use the same PostgreSQL-resolved capability set. Frontend visibility is a usability layer only; layouts, route handlers, services, and Payload remain authoritative.
- Removing `cms.access`, suspending, or disabling the PostgreSQL user prevents the Firebase session from resolving a Payload principal on the next request.
- The first administrator is created only by the idempotent `bootstrap:staff` script. It verifies Firebase email state and never handles a password.
