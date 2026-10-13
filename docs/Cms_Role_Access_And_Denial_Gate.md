# CMS role access and denial context

Date: 2026-10-13

## Requirement

CMS access is granted and revoked through PostgreSQL role permissions. Payload's
CMS principal is an identity mirror for content ownership and audit references,
not a second authorization system. CMS access-denied feedback stays in the CMS
workspace rather than redirecting to the public-site layout.

## Diagnosis

Read-only inspection of the reported GCP account confirmed an active application
user with `cms.access` and editorial permissions, but no matching CMS principal.
The deployed authentication strategy rejected that missing record. The existing
principal synchronization was called by the bootstrap script only.

## Implementation

- Firebase session verification and current PostgreSQL permissions run before
  reading or writing a CMS principal.
- An authorized user's missing principal is created on CMS authentication.
- Stale principal status and profile fields are refreshed from the authorized
  application user. Unchanged mirrors do not cause writes.
- Removing `cms.access` denies subsequent authenticated CMS requests, even when
  a principal already exists. Editorial permissions also come from current roles.
- Concurrent creation recovers only a principal with the same application user
  ID. An email collision cannot attach another user's principal.
- Missing sessions still go to sign-in. CMS denial uses `/cms/unauthorized` and a
  CMS-branded error view. Layout-level denial renders that view at the requested
  CMS URL instead of rendering protected content.
- Bootstrap synchronization reuses the same bounded principal lookup.

## Verification

- Seven focused test files, 81 tests passed: CMS authentication, role revocation,
  mirror synchronization and races, authentication navigation, CMS layout/routing,
  and resource/event permission enforcement.
- Type checking passed.
- Architecture boundaries, form architecture, and component reuse checks passed.
- Full lint passed with 17 existing warnings and no errors.
- Repository file-size checker remains blocked by two unrelated existing tests:
  `ServerApplicationDocumentService.test.ts` (400/300) and
  `ServerFormsService.test.ts` (363/300). The checker uses a 300-line threshold,
  while the repository instructions allow 400-line tests. This change does not
  modify those files or the checker.

## Acceptance limits

No GCP role, principal, deployment, or runtime was changed. No production build
was run. The fix requires deployment before it can repair the reported user's
missing mirror on their next authenticated CMS request. Live browser acceptance
and written release acceptance remain pending.
