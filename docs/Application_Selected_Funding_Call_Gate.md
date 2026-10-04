# Selected funding call application flow

Date: 2026-10-03

## Accepted behavior

The funding call detail Apply link carries `fundingOpportunityId` into the new
application page. That page shows the chosen call and asks the applicant to
select their business and start the application. It uses the existing creation
mutation to create or resume the draft and opens its editor.

Direct visits without a selected call retain the opportunity chooser. An
unavailable call shows an error or closed-call message rather than selecting a
different call. Applicants without businesses can use the existing business
dialog without losing the call context. Creation failures stay on the page.

The business selector, schema validation, and business setup dialog are reused
between both flows. The funding call readiness card moves into its owning
module's applicant UI. Existing protected APIs and server authorization remain
the authority for creating applications.

## Verification evidence

- Architecture and form boundary checks pass for 1,270 source files.
- File-size checks pass for 1,789 handwritten files.
- Focused lint passes for all changed source and test files.
- Repository lint reports six existing `react-hooks/refs` errors in
  `WorkflowGraphViewport.tsx` and 17 warnings. This is not a lint pass.
- Standalone type checking passes after build type generation completes.
- The focused UI tests pass: nine tests across the business setup, selected
  funding call, and funding opportunity detail suites. Both page context tests
  also pass.
- Full suite: 1,755 passed, 115 skipped, two failed. Both failures are the
  previously documented funding opportunity card assertions for closing-date
  wording and locating the save button. This is not a full-suite pass.
- Production build (`npm run build`) passes, including compilation, TypeScript,
  static page generation, and build tracing.

## Acceptance scope

The selected-call flow is accepted based on its focused regression tests and
passing architecture, file-size, focused lint, and type checks. Whole-repository
acceptance remains qualified by the existing lint and card-test failures.
No deployment or authenticated browser walkthrough was performed.
