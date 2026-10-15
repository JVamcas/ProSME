# Contact page redesign verification — 2026-10-15

## Scope and acceptance

Implemented the approved contact mockup at `/contact`: centered heading,
warm page background, one rounded panel, cream contact column, navy appeals
card, and white enquiry form. The columns stack below the desktop breakpoint.
The heading and introduction follow the approved mockup; contact details and
page metadata continue to use CMS content. Optional telephone and office hours
remain conditional on published content.

Reused `PublicPageHeader` with an optional centered variant,
`ContactDetailsCards`, `ContactForm`, `FormInput`, `FormTextarea`,
`CheckboxField`, `HoneypotField`, `GeneralButton`, and `ArrowLink`.
Moved the existing form from the legacy public components folder to
`modules/engagement/ui/public/ContactForm.tsx`; no compatibility duplicate remains.
Existing React Hook Form/Zod validation, mutation, reset, consent, honeypot,
pending state, and status/error messages are preserved.

Source acceptance: the requested composition and existing behaviour are
implemented, with the checks below. Rendered visual acceptance remains open.

## Evidence

- Architecture, form architecture, and component reuse: passed
  (`npm run check:architecture`; 2,175 source files).
- Lint: repository lint completed with no errors and 20 warnings outside these
  changes. Focused lint passed for all changed implementation and test files.
- Type checking: passed (`npm run typecheck`).
- Focused tests: 14 passed across `ContactPage.test.tsx` and
  `CmsContactDetails.test.tsx`. Coverage includes the existing banner variant,
  contact projection, optional details, appeal/privacy links, one enquiry form,
  named controls, hidden honeypot, pending submission, and success/error status.
- All changed implementation and test files are below the repository limits.
- Repository-wide `check:files` remains blocked by unrelated existing files:
  `FormRepository.ts` (422/400), `FormDraftSyncPostgres.test.ts` (392/300),
  `WorkflowTemplateDeletionPostgres.test.ts` (332/300),
  `ServerApplicationDocumentService.test.ts` (400/300), and
  `ServerFormsService.test.ts` (363/300), using the gate's configured limits.
- Browser verification attempted using an isolated static render of the actual
  components with fixture contact data. Installed Chromium cannot launch because
  `libnspr4.so` is missing. No browser or system dependencies were installed.
  Desktop/mobile screenshots, hydrated submission, and live CMS/API acceptance
  are unverified.
- No production build, deployment, database change, or external message was made.
