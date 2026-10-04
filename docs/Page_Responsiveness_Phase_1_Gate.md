# Page responsiveness phase 1

Date: 4 October 2026. Owner and engineering reviewer: Codex.
Revision: working tree based on da025565. Entry: G0 accepted. Acceptance: accepted after the evidence below.

The portal shell, navigation, query provider, capability context, logout,
loading and error components now live in shared/ui/portal. The applicant route
ancestor is (portal); public URLs are unchanged. Native Next Link pending state
announces navigation without intercepting keyboard, modified clicks or history.
Dashboard loading boundaries use decorative skeletons without fabricated data.
Mobile navigation keeps the selected destination visible while pending and
closes on route commitment; Escape/outside dismissal remains available.

Architecture, file limits, lint, typecheck and the production build passed.
Lint retains 17 existing warnings. The full suite passed: 505 files and 2073
tests, with 44 files/178 tests skipped by their existing opt-in configuration.
All five production Chromium acceptance cases passed: keyboard/pending with
usable shell controls, modified clicks, rapid destinations/history, aborted
route preparation recovery, and mobile pending/viewport fit. A stale build was
identified by the mobile case, rebuilt, and all five cases repeated successfully.

[Phase 1 observations](page-responsiveness-evidence/phase-1.json) include three
staff-dashboard samples per condition. Delayed pending feedback median is
104.5 ms (baseline 167.4 ms); warm feedback is 125.1 ms. This meets the 150 ms
feedback target. Delayed structure still takes 1550.6 ms because this phase
does not remove business-data waits. Warm data was slower in this sample
(1266.9 ms); phases 2–3 must meet G0's full-data regression targets before their
acceptance. No destination-speed improvement is claimed at this gate.

All baseline failing default tests, file-size, lint and type errors were repaired
and verified in the full checks above. The optional database setup experiment
described in G0 is not included in the passing default-suite claim.

Rollback: reverse shell/route placement and navigation changes together;
restore imports with the move. Isolated measurements do not alter production.

## Criterion review and exact checks

All G1 criteria are met: delayed feedback precedes data; native navigation
cases pass; skeletons have no fabricated results; shell controls work while
pending; quality checks pass. Reviewed synthetic screenshots:
[desktop pending](page-responsiveness-evidence/page-responsiveness-desktop-pending.png),
[mobile pending](page-responsiveness-evidence/page-responsiveness-mobile-pending.png),
[mobile destination](page-responsiveness-evidence/page-responsiveness-mobile.png).

Commands (all exit 0 in the production environment described in G0):

- `npm run check:architecture` and `npm run check:files`.
- `npm run lint`, `npm run typecheck`, `npm run build`.
- `npm test --workspace @prosme/platform -- --maxWorkers=2`.
- From apps/platform, `npx playwright test --config playwright.responsiveness.config.ts`
  with RESPONSIVENESS_SESSION and Chromium library path set to private temporary paths.
- G0 runner with RESPONSIVENESS_ROUTE=/admin and RESPONSIVENESS_SAMPLES=3.

Evidence logs were retained under /tmp/page-responsiveness/g1-*.log during review;
raw non-secret timings and screenshots are attached above. Acceptance is
engineering acceptance for phase 1 only, not release/deployment acceptance.
