# Chatbot case details drawer

The case reference in both Operations queues uses the existing shared
`ArrowLink`. A normal click opens the shared `RightDrawer` over the current
queue. Modified clicks retain the direct case URL. Direct case URLs open the
same drawer with the user's permitted monitoring or personal queue behind it.
Closing a direct-entry drawer returns to that queue.

The drawer shows case status, escalation reason, assignee, screened history
as visitor/guidance bubbles, consented contact when present, resolution notes,
and existing permission-dependent case state and assignment forms. The existing
message bubble component now belongs to the feature's common UI folder so both
audiences reuse it. Support visitor bubbles use the approved light peach color;
public bubble styling retains its default appearance.

The change preserves existing query hooks, client services, server permission
and assignment policies, React Hook Form/Zod forms, and row-version updates.
No database or API behavior changes are required.

## Local acceptance

- Architecture, form architecture and component reuse checks passed.
- File-size check passed.
- Type checking passed.
- Lint passed with 26 existing warnings and no errors.
- Drawer, follow-up permission and queue-scope suites passed: 3 files, 16 tests.
- Drawer checks cover lazy protected reads, existing ArrowLink rendering,
  bubble history, Escape closure and focus restoration, modified clicks,
  direct entry/closure, denied reads, assignment-context controls and form submit.

The broader public visitor UI suite has two existing failures at
`ChatbotVisitorUi.test.tsx:46` and `:204`: missing footer disclosure and an old
contact prompt expectation. The same two failures were reproduced using the
original public transcript/bubble components from HEAD, then the current
implementation was restored. These unrelated assertions remain unresolved.

Local source and focused test acceptance is recorded here. Browser visual and
deployed acceptance remain unverified. No production build was run.
