# Work queue links to application Workflow Progress

Date: 2026-10-03

## Accepted behavior

- An enabled task-name link opens /admin/applications/<applicationId> with
  tab=workflow-progress and the taskId query parameter. Blocked rows without
  information requests retain their disabled task name.
- The application page selects Workflow Progress when that tab is available;
  normal application visits retain Overview as the default. Unknown tab values
  and unavailable workflow tabs fall back to Overview.
- Staff with all-workflow read access use the existing full progress query.
  Staff with assigned-workflow access require a valid task UUID plus both
  assigned task/workflow read permissions. The existing progress service
  verifies assignment, task view permission and the application/workflow match.
  A query parameter never grants access.
- No application, workflow or task records are modified.

## Verification

- Focused tests passed: 22 across four files. Coverage includes the generated
  task link, information-request and blocked variants, selected tab, fallback,
  validated task context, missing grants and existing assigned-progress policy.
- Architecture and form boundary gates passed for 1,311 source files.
- All changed files meet the file-size gate; the repository gate continues to
  report the unrelated application-submission-database.test.ts at 316/300.

- Changed-file ESLint and staged/unstaged whitespace checks passed.
- Full lint reports six existing react-hooks/refs errors and 20 warnings
  elsewhere. Type checking reports only the existing incomplete AuthenticatedUser
  fixture in WorkflowAssignedProgress.test.ts:23.

Production build was not run, as instructed. Acceptance covers source behavior;
no live Docker image or deployment was updated.
