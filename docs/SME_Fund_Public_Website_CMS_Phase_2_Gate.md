# Public Website CMS — Phase 2 gate record

Date: 2026-09-29

## Implemented

- `/cms` presents a Home entry and `/cms/home` lists the visible Home sections in public order. The guide shows current copy, available images, draft/live state, preview and live links, section editor links, related entries, and shared header/footer ownership. The operations funding-call link appears only with operations access.
- The Home hero, action cards, funding-call slogan, process steps, support introduction, news introduction, and Impact campaign message now use Payload fields. Action destinations, application status labels, and navigation controls remain code-owned.
- Home news and resources use at most two published items of each type, ordered by publication date or creation date with ID as a stable tie-breaker. Missing items remain missing. Legacy resource-grid `limit` and unused Homepage controls are hidden.
- Payload migrations add the new fields and backfill process steps for existing Home versions. A follow-up migration repairs the versioned step table name on databases that ran the first migration and covers the Impact field on shared page blocks. The seed uses the same visible copy as before. Payload types and import map were regenerated.
- Draft preview has a visible indicator and Exit preview control.

## Verification

- Architecture and form architecture checks passed for 1,185 source files. File-size checks passed for 1,651 handwritten files. Type checking and lint passed; lint reported 18 warnings.
- Eleven focused Home guide, rendering, and feed tests passed. The full suite completed with 1,491 passed, 80 skipped, and 14 failed across unrelated form, workflow, badge, and navigation tests. It is not a passing repository test gate.
- The production build passed with the `/cms/[[...segments]]` route.
- The local Payload repair migration was applied through the normal migration runner. The local content seed then completed successfully with the rebuilt migrations image. Desktop/phone screenshots, authenticated CMS navigation, draft/publish and unpublish checks, version recovery, and a nontechnical editor walkthrough remain to be recorded.

## Acceptance

Written editorial acceptance is pending. Phase 2's exit gate remains open until the live CMS walkthrough, screenshots, and full repository test gate are accepted.
