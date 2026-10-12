# Public page visibility

Date: 2026-10-12

## Approved scope

CMS → Public Page Visibility contains a recursive page/section tree and On/Off
switches, using the existing CMS layout, header, buttons, Payload form handling,
and Ant Design switch primitive. Changes save immediately; no separate save or
publish controls are shown. Home remains enabled.

A hidden ancestor makes every descendant effectively hidden and disables its
switch. Stored child preferences remain intact and return when ancestors are
enabled. Existing pages default to visible.

Home children control the existing banner, action cards, process, support, and
additional content. Funding → Overview children control its three editorial
sections. Those editorial switches do not change funding call publication or
eligibility rules. Funding's parent switch controls its public pages and aliases.

## Enforcement and persistence

- Public route boundaries return 404 for disabled sections and their URLs.
- Desktop/mobile navigation, footer links, homepage links/feed and sitemap
  entries use the same inherited visibility policy.
- Hidden Funding, FAQ and Contact sources are excluded from active chatbot
  knowledge preparation. Transactional visibility reads share the existing
  source transaction, so background synchronization needs no Next request.
- Writes require the canonical `cms.site-settings.update` permission through
  Payload's existing global access policy. Its audit hook records writes in
  the same transaction; unsuccessful saves restore the displayed settings.
- A separate non-draft Payload global stores the settings. Repeatable migration
  `20261012_160000_public_page_visibility` creates and initializes its table
  without resetting existing settings. Types/import map were regenerated.
- Existing public navigation moved into its owning content module.

## Recorded implementation evidence

- Type checking passed.
- Repository lint passed with 26 existing warnings and no errors.
- Architecture boundaries, form architecture, component reuse and file-size
  checks passed.
- Initial focused validation: 7 files / 51 tests passed, including CMS navigation,
  inheritance, toggle saving/rollback, query exclusion and access controls.
- Final affected route/UI validation: 6 files / 31 tests passed.
- Real React server renderer: 8 tests passed, including persistent cache
  invalidation after toggling visibility and published-only homepage reads.
- Disposable PostgreSQL: 3 visibility tests passed, proving repeatable migration,
  persistence, audited writes, rejected unauthorized writes and invalid input.
- Disposable PostgreSQL chatbot synchronization: 9 tests passed, including hidden
  parent removal and restoring previously active selections. Container removed.
- Broader content validation passed 459 tests; its renderer fixture failures
  were resolved by handling the new visibility read, existing application DB
  imports, and separating synthetic invalidation timestamps. All 8 renderer
  checks subsequently passed.

## Acceptance limits

Implementation verification is complete. Browser visual acceptance and migration
on the target application database remain pending. The application database was
not changed; no deployment or production build was performed. This record does
not claim browser or deployed acceptance.
