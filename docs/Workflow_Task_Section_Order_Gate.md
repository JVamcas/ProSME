# Workflow task section order — local acceptance

Date: 12 October 2026

## Scope and behavior

Editable draft task previews expose drag handles on the step progress markers.
Dropping a step saves its order automatically through the existing workflow
draft mutation. Keyboard sorting uses Space, arrow keys, and Space to drop;
Escape cancels a drag. The financial review can therefore be arranged as
Documents → Financial Information Form → Checklist.

The task's existing JSON configuration stores `sectionOrder` using stable
section identifiers. No database schema change or migration is required.
Unconfigured definitions retain their existing order. Sections enabled later
are appended in the existing default order. Other task configuration, stages,
transitions, and review data are preserved.

Preview and reviewer runtime share the ordering function. Collapsible task
sections also respect the saved order. Drag controls are restricted to draft
step previews with edit access; runtime reviewers cannot rearrange definitions.
Published versions remain immutable, and applications continue to use their
pinned workflow versions. This change does not update any stored financial
review definition or add applicant financial-information fields.

The existing server update requires `workflow.definition.update`, restricts
editing to drafts, checks the expected row version, and retains its existing
transaction/audit path. The preview waits for a successful update before showing
the new order, uses the returned row version for subsequent edits, blocks
duplicate in-flight saves, and reports failed updates without changing the saved
order. Closing the preview is deferred while saving.

## Verification evidence

- `npm run check:architecture`: passed architecture, form, and component reuse
  checks for 2,053 source files.
- `npm run check:files`: passed for 2,996 handwritten files. The task work-section
  renderer was split from its step layout to meet the gate's 400-line limit.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 17 existing warnings and no errors. No warning
  concerns files changed for this feature.
- Focused Vitest run with `--maxWorkers=1`: 11 files, 60 tests passed. Coverage
  includes keyboard dragging, saved and reopened order, subsequent row versions,
  failed saves, denied/published previews, preservation of unrelated graph data,
  validation, runtime projection, stable active section and input preservation,
  ordered navigation/final actions, and read-only/collapsible rendering.
- `git diff --check`: passed.

## Written acceptance and limits

Local source and automated component acceptance: accepted for draft preview
reordering and shared runtime rendering, based on the evidence above.

Browser acceptance remains open. Launching the existing Playwright Chromium
failed because `libnspr4.so` is missing. No browser or system dependencies were
installed. Real pointer/touch dragging, visual layout, and live database
persistence have not been verified in a running authenticated application.
The full test suite, production build, and deployment were not run.

## Follow-up: prevent overlapping step labels

The shared step progress component now gives each item its intrinsic label
width plus horizontal spacing and prevents it from shrinking. Its row expands
beyond the viewport when necessary, inside a horizontally scrolling container.
The connectors use two half-width segments per item so they remain aligned
when adjacent steps have different widths. Application forms and task previews
both use this component.

Local follow-up acceptance: accepted after the architecture and file-size gates,
lint (17 existing warnings, no errors), and type checking passed. The focused
drag, ordered task rendering, and task dialog tests passed: 3 files, 6 tests.
No additional tests were added for this CSS change. Browser visual acceptance
remains open under the Chromium limitation documented above.
