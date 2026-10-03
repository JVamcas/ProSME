# Generic authentication return destinations

Date: 2026-10-03

## Accepted behavior

Requests to protected applicant, staff, and CMS pages preserve their actual
pathname and query string in the sign-in `returnTo` parameter. A shared page
authentication helper resolves the existing Firebase/PostgreSQL user context
and redirects anonymous users before page-specific reads or permission checks.
Existing permission and resource-context checks still run for authenticated
users. Protected API behavior is unchanged.

Next.js Proxy overwrites the internal request-path header using the incoming
URL. Client-supplied header values cannot substitute another return path. This
uses the upstream request-header mechanism documented in the official
[Next.js Proxy reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
Proxy performs no authentication or database reads.

Sign-in restores the validated local destination. Registration, verification,
and password-reset screen links preserve it. Legacy `next` URLs remain
supported; `returnTo` takes precedence. Missing or unsafe destinations use the
session's existing default landing page. External URLs, protocol-relative URLs,
backslashes, control characters, and malformed encoding are rejected.

The destination has no funding-call-specific routing policy and no cancellation
behavior. Public funding call Apply handoffs use the shared URL builder.

## Verification evidence

- Architecture and form boundary checks pass for 1,273 source files.
- Final file-size checks pass for 1,796 handwritten files.
- Standalone type checking passes.
- Focused lint passes with zero errors and one existing unused-import warning
  in the notification channel page.
- Focused regression suites: 36 tests pass for URL validation, Proxy header
  handling, anonymous/signed-in page authentication, navigation through
  sign-in/registration/verification, adjacent authentication links, and
  existing application page/progress behavior.
- Six additional authentication page tests pass for query parsing, legacy
  `next` compatibility, and unsafe destination rejection.
- Repository lint reports six existing `react-hooks/refs` errors in
  `WorkflowGraphViewport.tsx` and 17 warnings. This is not a lint pass.
- Full suite: 1,784 passed, 115 skipped, three failed. Two failures are the
  previously documented funding opportunity card assertions. The third is the
  funding opportunity detail test expecting the deadline card removed by an
  unrelated concurrent workspace edit. This is not a full-suite pass. The six
  additional page tests were run separately after this suite started.
- The production build passes on retry after another build released its shared
  output lock. Compilation, TypeScript, static generation, tracing, and Proxy
  inclusion all complete successfully.

## Acceptance scope

The generic authentication navigation is accepted on the focused regression
evidence. Whole-repository acceptance is qualified by separately recorded
workspace failures. No deployment or authenticated browser walkthrough was
performed.
