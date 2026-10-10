# Workflow template definitions and versions

Date: 2026-10-10

## Implemented behavior

- The outer shared DataTable contains one collapsible row per active template,
  with Template, Latest Version, and Actions. Latest means the highest version
  number, including drafts. Template counts and pagination happen in SQL.
- Expanding a template loads a bounded version page for that exact definition.
  The inner shared DataTable retains Template, Version, Status, Updated, and
  Actions. Links and commands explicitly select the displayed version ID.
- Parent Edit definition opens the name/description form. Saving
  updates only definition metadata, with timestamp concurrency and an audit
  record in the same transaction. It does not create or change versions.
  Publication does not overwrite these independently edited definition details.
- Version Edit opens the selected draft. Editing a published version creates or
  resumes the draft for that exact source, then opens that resulting draft.
- Create draft version uses the selected source and retains template identity.
  Draft rows offer Edit; creating another draft from a draft is disabled.
- Create new template (v1) copies the selected version configuration into a new
  template identity, with an automatically generated code and a draft first version. The
  definition, version, graph, and source-provenance audit are written atomically.
- Existing version publication and protected first-draft deletion remain.
  The existing temporary internal-testing Draft/Approved publication policy is
  unchanged. Server checks use canonical read, update, create, and publish
  permissions; copy commands verify source-version ownership of the template.

## Engineering acceptance and evidence

Accepted for the requested implementation scope:

- Focused workflow definition and template route suite: 197 tests passed in
  39 files. Two additional version-page permission/scope tests subsequently
  passed in the focused read/route rerun (13 tests in two files).
- PostgreSQL disposable-schema tests: three grouped-template tests passed,
  covering parent and version pagination boundaries, ordering, inactive scope,
  exact projections, published-definition editing, stale edit rejection,
  unchanged version snapshots, publication retaining canonical metadata, and
  independent draft-v1 copies with exact form bindings/routes and audit origin.
- Existing published-asset draft/publication PostgreSQL regression: three tests
  passed, with the workflow definition expectation updated to the independently
  edited definition model.
- Type checking passed. Full lint passed with zero errors and 23 existing
  warnings. Architecture and form-boundary gates passed for 1,779 source files;
  file-size gate passed for 2,619 handwritten files. Changed-function AST check
  found 293 functions, maximum 200 lines, with no violations.
- UI evidence uses Happy DOM; PostgreSQL evidence uses disposable schemas in the
  existing local database. These are not deployed browser acceptance.

## Delivery boundary

No new database migration is required for grouping, definition metadata edits,
  or independent template copies. The preceding source-version implementation
  still requires migration 0187 in environments where it has not been applied.
  No production build, browser installation, container rebuild, GCP deployment,
  or production acceptance was performed for this change.

## Generated template codes follow-up

The template form now shows only name and description. Its Zod resolver reuses
`stableKeyFromLabel` to generate codes for new templates, with a UUID suffix so
repeated copies of the same name receive distinct codes within the 80-character
limit. Definition edits preserve the stored code. Canonical server validation
and persistence remain unchanged.

Engineering acceptance: 19 focused schema and UI tests passed across four files,
including repeated-name generation, unusual/long names, rename stability, and
successful exact-source copy submission without a code field. Type checking,
focused lint, architecture/form boundaries, and file-size checks passed. No build
or deployment was performed for this follow-up.
