# D1 public user journeys correction — 7 October 2026

Status: focused automated verification passed. Browser, live GA and user
acceptance remain pending. This supersedes the predefined-funnel interpretation
of the User journeys card in the original D1 implementation record.

The card displays the top three observed sequences of two or three consecutive
public-page steps, ranked by GA `totalUsers`, with numbered rows, arrows and
readable labels. The Completed and Rate columns are removed. The separate
Application funnel keeps its existing meaning.

Only public routes contribute journey steps. Sign-in, registration, applicant
portal, staff and CMS activity break sequence continuity and do not enter this
card. The public Start application click contributes the final handoff step
before its server redirect; it does not record an actual application start.
The date filter applies; the funding-call filter does not narrow this public
website card, matching the independent scope of the top-pages card.

Consenting visitors generate `website_journey` events with an allowlisted
`journey_path` containing only short page keys. Private identifiers, answers,
queries and fragments never enter the sequence. Consecutive repeated steps are
collapsed; sequences survive reloads in tab storage and expire after 30 idle
minutes. Two- and three-step sequences overlap, so user counts are not additive.
Empty, unavailable and stale sources do not generate invented ranked paths.
GA sampling and thresholding remain visible through the existing panel details.

Activation requires migration `0166_website_user_journeys.sql`, deployment of the
updated collection code, and the event-scoped `journey_path` custom dimension.
`npm run analytics:configure` now idempotently ensures both `funding_call_id` and
`journey_path`; `--dry-run` checks without writing. No live configuration change
or application-database migration was performed in this correction. Historical
funnel totals cannot reconstruct these newly collected page sequences.

Verification evidence:

- Seven focused journey/reporting test files: 32 tests passed.
- Real PostgreSQL snapshot and sync repository tests in disposable test schemas:
  nine tests passed. The fixture runs the new migration twice and verifies
  journey projection and preservation after a failed source refresh.
- GA configuration helper: 13 tests passed.
- Type checking, architecture/form boundaries and file-size checks passed.
- Repository lint: zero errors, 13 existing warnings. Changed source files also
  passed focused lint.
- The broader reporting run had one unchanged KPI expectation failure in
  `WebsiteAnalyticsMetricCards.test.tsx` for “Comparison unavailable”;
  88 tests passed and 11 opt-in database tests were skipped in that host run.
  The failing test and its implementation files match HEAD.
- No production build or authenticated browser/live-provider check was run.
