# Reviewer assignment visibility

Date: 2026-10-07

## Requested behavior

Remove identity hiding between staff reviewers. Authorized staff can see who is
assigned to each review slot while peer scores and review content continue to
follow the configured release rule.

## Implementation

- The workflow progress projection retains peer assignee names, emails, and
  roles before release. The existing assignment table displays those fields.
- An unreleased peer review still returns `canOpen: false`. Task identifiers,
  processing details, and timestamps retain their existing restricted projection.
- Disabled peer review rows show a small note explaining that scores and review
  content are hidden until stage completion or the required review threshold,
  according to the saved release rule. The existing disabled-task presentation
  renders the note and lock indicator. The note clears when reviews are released.
- Completion-condition values remain hidden when peer evidence is unreleased.
  Server-side task, form, and document access retain their peer-release checks,
  including when a reviewer also holds all-task read permission.
- Vacant slots retain their null assignee fields. The table's existing role
  fallback and `Unassigned` label continue to describe the stored assignment.
- Implementation-plan section 9.4 now distinguishes staff assignment visibility
  from protected peer responses, scores, and recommendations. Applicant-facing
  identity protections are unaffected.

The change stays in the workflow module and reuses the existing assignment
table, permission codes, release configuration, and infrastructure policies.
It requires no schema migration or change to saved workflow definitions.

## Validation and acceptance

- Focused regression suite: eight files, 42 tests passed. Coverage includes
  staff identity visibility, rendered vacant-slot labels, score masking after
  the viewer submits, rendered stage/threshold restriction notes and their
  removal after release, task links, oversight permissions, and existing task,
  form, and document access protections.
- Type checking passed.
- Lint completed with zero errors and 13 warnings outside the changed files.
  Focused lint after adding restriction notes passed without warnings.
- Architecture and form boundary checks passed for 1,544 source files.
- File-size checks passed for 2,257 handwritten files. The changed projection
  function and test callbacks remain within the 200-line function limit.
- `git diff --check` passed.

Automated source checks support the requested behavior. Database boundaries in
the regression suite are mocked; no live browser acceptance or deployment of
this change is claimed. The full suite and production build were not run.
The existing GCP deployment remains unchanged. User acceptance is pending.
