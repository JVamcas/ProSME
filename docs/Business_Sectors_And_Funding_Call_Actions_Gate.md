# Business sectors and funding call actions

Date: 2026-10-09

Primary sector is required and secondary sector is optional. Both dropdowns
offer the client's twelve sectors and Other (please specify). Selecting Other
reveals a required text field for that selection. The shared Zod schema checks
the choices and Other details in the form, create/update routes, and service.
The word unticked from the client's message is not a sector option.

Existing primary sector text remains stored and readable in business responses
and lists. Custom or legacy values reopen under Other in the business editor,
with their original text preserved. Secondary sector is nullable in storage.
The business repository and table schema now belong to the business module;
the existing shared business dialog and React Hook Form are reused.

Application entity details copy an optional secondary sector alongside the
existing primary-sector key. An absent secondary is copied as an empty value,
so subsequent business-profile edits cannot populate it in an existing
application or its submission snapshot. Historical snapshots are not rewritten.

The funding call header uses one Actions dropdown. Edit retains the existing
replacement-draft command. Publication, approval, and operational actions keep
their permission/status checks and existing confirmation/reason dialogs.
Published-version rows use the shared ActionMenu. View version loads the exact
selected published version into the shared RightDrawer rather than a draggable
dialog. Pagination and read-only historical configuration remain unchanged.

## Verification

- All 86 focused tests in 14 files passed, covering sector choices and optional
  secondary validation, Other details, legacy editor values, ownership and
  permissions, create/update API rejection, copied application values, header
  actions, confirmation dialogs, and historical version drawer interactions.
- All four PostgreSQL tests in two files passed using disposable schemas and
  synthetic records. They cover applying migration 0184 twice, preserving
  existing primary data, secondary persistence/clearing, explicit list
  projections and ownership, audit records, and application version pinning
  through submission while sharing effective funding call dates.
- Type checking passed. Full lint completed with zero errors and 23 existing
  unrelated warnings; focused lint after the final business edits also passed.
- Architecture/form architecture and file-size checks passed. A separate AST
  check found no functions above 200 lines in 31 changed TypeScript files.
- Whitespace checks passed.

Migration `0184_business_secondary_sector.sql` is registered in the migration
journal and must be applied before running the updated application. It was
tested in disposable schemas and has not been applied to the running local app.
No production build, deployment, or browser acceptance was performed. UI
interaction evidence is from the existing happy-dom test environment.
