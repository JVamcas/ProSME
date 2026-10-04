# Workflow task oversight reads

Date: 2026-10-04

## Requested behavior

Users with `workflow.task.all.read` can open another person's workflow task in
the existing task workspace to inspect saved work. Viewing a task does not grant
permission to edit, upload evidence, evaluate eligibility, complete work, or
execute a decision on another reviewer's behalf.

## Acceptance criteria and implementation

- **Task viewing:** The page accepts assigned-task or all-task read permission.
  Server read services derive the scope from the authenticated user's canonical
  grants. SQL filters configured view permission and assignment for restricted
  reads before loading task content. No admin role-name bypass is used.
- **Read-only oversight:** Another user's task returns `readOnly: true` and no
  processing actions. The workspace identifies the assignee and reuses the task
  review sections with editing, uploads, autosave, and eligibility controls
  disabled. Completed/historical work can also be inspected under all-task read.
- **COI:** Oversight returns an explicit read-only access marker without claiming
  COI clearance or asking the viewer to declare on behalf of the assignee.
  Assigned work retains its own COI flow and configured action permissions.
- **Forms:** Reads use the task's pinned version and current assignee's response.
  Completed responses use their immutable definition snapshot. Runtime context
  remains limited to the form's configured exposed fields. Assigned-only form
  access requires a personal assignment, rather than role membership.
- **Documents:** Downloads authorize task access and verify that the requested
  evidence version belongs to the task's document requirements before storage is
  read. Uploads continue using the restricted assignment path.
- **Writes:** Review-draft, completion, form-save, form-completion, COI, and action
  paths retain their existing assignment, permission, readiness, and concurrency
  checks. All-task read is not accepted as write authority.
- **Peer reviews:** Unreleased parallel peer evidence remains hidden when the
  viewer is also a reviewer of the same definition in that stage run. The same
  SQL predicate protects task details, form reads, and oversight access metadata.
- **Navigation:** Task assignment links respect the server's `canOpen` flag.
  Planned tasks stay unlinked. Users without read access receive an unavailable
  or permission message. Administrative observers can inspect blocked work.
- **Escalations:** Assigned-only senders retain their existing tracking view.
  All-task readers can inspect a transferred task while retaining their own
  escalation tracking and cancellation controls.

## Structure and reuse

The change reuses the existing task page, review sections, form renderer,
document download route, COI gate, and TanStack Query hooks. The task services
touched by this feature moved into `modules/work-queue/application`. Task-form
reads and workflow task projections were extracted into focused application
files to keep files and individual functions within the repository limits.
Repository filters and projections remain in their owning infrastructure layer.

No permission catalogue, grant, schema, migration, or deployment change is needed
for this implementation. Effective grants in a running environment still
determine which users can use oversight access.

## Validation and acceptance

- Focused regression suite: 26 test files, 95 tests passed. After completing the
  typed test-user fixtures, the affected subset passed again: 14 files, 46 tests.
- Standalone TypeScript check: passed after the production build.
- Lint: passed with zero errors and 16 existing warnings.
- Architecture and form architecture: passed for 1,395 source files.
- File limits: passed for 2,039 handwritten files. Changed functions were also
  checked against the 200-line limit with no violations.
- Production build: passed. No application implementation changed after this
  build; subsequent changes completed test fixtures and this validation record.
- Whitespace check: `git diff --check` passed.
- Full suite: 2,265 tests passed, 207 skipped, one failed. The failure is
  `operations-list-screens.test.tsx`, "renders the real application projection
  fields", which expects `SMEF-2026-000123` where the existing application list
  renders the application ID. The same failure was reproduced against an
  unchanged HEAD archive (four other tests in that file passed).

The focused implementation satisfies the acceptance criteria above. The
repository-wide test gate remains unpassed because of the independently
reproduced existing application-list failure. This record is implementation
validation, not a claim of live-environment or user acceptance.

Database and storage boundaries in the focused regression tests are mocked;
query projection/filter assertions inspect generated SQL. The tests do not
establish that the new behavior is deployed or verified against live task data.

Deployment to the running SME Fund site has not been performed.
