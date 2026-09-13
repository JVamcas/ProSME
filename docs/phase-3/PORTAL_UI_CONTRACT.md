# Phase 3 portal and UI contract

## Status

- Increment: P3.0
- State: Agreed
- Applies to: applicant `/portal` and operations `/admin`
- Deployment: the single `apps/platform` Next.js application

This contract fixes the portal structure and visual rules without fixing
programme-specific workflow configuration that the client has not approved.

## Portal boundary

The product has one authenticated portal system with two permission-scoped
route spaces. It does not have two applications or two copies of the portal
shell.

| Route space | Audience         | Data boundary                                                |
| ----------- | ---------------- | ------------------------------------------------------------ |
| `/portal`   | Applicants       | The current applicant's own records only                     |
| `/admin`    | Operations users | Records permitted by capabilities and assignment scope       |
| `/cms`      | Content users    | Payload content only; no application authorization ownership |

A user with both applicant and operations capabilities can switch spaces. The
post-login destination is resolved from capabilities, never a display role.

## Shared shell contract

One shared authenticated shell owns:

- the SME Fund logo;
- responsive desktop sidebar and mobile navigation;
- authenticated user summary and logout;
- route catalogue rendering and recursive capability filtering;
- page frame, breadcrumbs, notifications entry point, loading and error states;
- hydrated permission context from one server projection.

Applicant and operations route catalogues are separate data objects composed
by the same navigation components. An inaccessible child is removed before an
empty parent section is removed.

Each route entry declares:

```text
id, href, label, icon, space,
requiredCapability | requiredAnyCapabilities | requiredAllCapabilities,
children
```

## Capability gate contract

`CapabilityGate` accepts one, any, or all capability requirements and supports
hide, fallback, and forbidden modes. It can also receive ownership or assigned
resource context. It never compares human-facing role names.

The gate and filtered sidebar are usability controls only. The corresponding
layout/page, route handler, service, repository projection, and document
adapter independently enforce authorization on the server.

## Applicant information architecture

The applicant navigation is:

1. Dashboard.
2. Funding Opportunities.
3. My Businesses.
4. My Applications.
5. Notifications.
6. My Profile.

Help and Support and Logout are footer actions. My Businesses owns the
applicant's business list and add, edit, and delete flows. Information requests
remain contextual to an application rather than becoming a generic Messages
route.

An application workspace has stable tabs independent of internal workflow
configuration:

```text
Overview | Documents | Status | Information Requests
```

It exposes the next applicant action, autosave and connectivity state,
applicant-safe timeline, and communications. It never exposes internal scores,
comments, recommendations, assignments, role names, or committee deliberation.

## Operations information architecture

The operations navigation is capability-filtered:

1. Dashboard.
2. Work Queue.
3. Applications.
4. Information Requests.
5. Reports.
6. Users & Access.
7. Audit Log.

Help and Support and Logout are footer actions. Workflow Configuration is a
capability-gated administrative workspace rather than a permanent route for
all operations users.

Screening, assessment, finance, recommendation, and decision are work-queue
filters or saved views, not permanent navigation modules. An operations
application workspace has:

```text
Overview | Applicant | Documents | Assessment | Finance Review |
Recommendation | Decision | History
```

The task-specific workspace section renders the registered UI for the active
task definition.

## Client-approved colour contract

The source is page 11 of `SME Fund Brand Identity (1).pdf`.

| Token          | Value     | Use                                    |
| -------------- | --------- | -------------------------------------- |
| `brand-cream`  | `#F6F4E2` | Soft surfaces                          |
| `brand-yellow` | `#FFCA45` | Highlight and hover surface            |
| `brand-blue`   | `#6BAED6` | Information and supporting surface     |
| `brand-navy`   | `#0A183B` | Text, contrast, focus and dark surface |
| `brand-gold`   | `#C9A24D` | Warning and programme accent           |
| `brand-green`  | `#16A34A` | Success state                          |
| `brand-orange` | `#FF6F00` | Primary brand and action colour        |
| `brand-white`  | `#FFFFFF` | Supporting application neutral         |

Hard rules:

- Orange is the primary colour. Primary actions use orange with navy content.
- Standalone brand, feature, navigation, and action icons are orange.
- Icons on an orange surface are navy because orange-on-orange is invisible.
- A status icon can use green or gold only when it communicates that state and
  the same state is present in text.
- Phase 3 source uses `brand-*` tokens, not generic Tailwind orange colours,
  compatibility aliases, or hard-coded brand values.
- Darkened substitute oranges are prohibited.

Verified contrast ratios include navy on orange `6.24:1`, navy on yellow
`11.42:1`, navy on blue `7.17:1`, navy on gold `7.26:1`, and navy on cream
`15.71:1`. White on orange is `2.79:1` and is therefore prohibited for normal
text and meaningful icons.

## Semantic presentation

| State          | Surface                | Text                 | Icon                            |
| -------------- | ---------------------- | -------------------- | ------------------------------- |
| Primary/action | Orange                 | Navy                 | Navy                            |
| Information    | Blue or cream          | Navy                 | Orange                          |
| Success        | Pale/low-opacity green | Navy                 | Green with text cue             |
| Warning        | Pale/low-opacity gold  | Navy                 | Gold with text cue              |
| Critical/error | Cream with navy border | Navy                 | Orange with explicit error text |
| Draft/pending  | White or cream         | Navy                 | Orange                          |
| Disabled       | Cream                  | Reduced-opacity navy | Reduced-opacity orange          |

Colour never communicates status alone.

## Responsive and state requirements

Applicant and operations views must define loading, empty, success,
recoverable-error, permission-denied, session-expired, offline/retry, stale
data, and destructive-confirmation states where applicable. Applicant forms
also define autosave, conflicting draft, upload/scan, validation, conditional
eligibility, and action-required states. Keyboard focus, labelled icons,
minimum touch targets, and mobile completion paths are acceptance requirements.

## UI implementation references

- `applicant-portal-all-screens-desktop-v1.png`
- `applicant-portal-all-screens-mobile-v1.png`
- `admin-portal-all-screens-desktop-v1.png`
- `admin-portal-all-screens-mobile-v1.png`

These images define composition and hierarchy. This contract controls where an
image conflicts with permissions, accessibility, data exposure, or branding.
