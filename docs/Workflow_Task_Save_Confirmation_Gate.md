# Workflow task save confirmation

Date: 2026-10-12

## Accepted behavior

Entering Assignment & completion through Continue or its step marker does not
save the task. Continue and Save task have distinct React keys, so the navigation
button is not reused as a submit button during the step transition. The form
accepts a submit only on the final step with the named Save task button as its
submitter. This follows the existing workflow action editor pattern.

Existing step validation and one atomic save remain in place. Navigating back
and returning to the last step does not save. Selecting Save task still saves
once and closes the dialog after success.

## Evidence and acceptance scope

The focused task/action dialog and generated-key regression run passes 11 tests
across three files. The new happy-dom tests cover navigation using Continue and
the step marker, distinct button DOM nodes, rejection of a submission without
the Save task submitter, returning to the last step, and successful explicit
saving. These DOM tests are not an authenticated browser walkthrough.

Architecture/form boundaries, component reuse, file-size checks, focused lint,
type checking, and whitespace checks pass. The source change is accepted within
this local verification scope. No production build or deployment was performed.
Browser and deployed acceptance remain unverified.
