# Form field rule save fix

Date: 2026-10-15

## Change

Field saves identify an existing field using the submitted field ID, independently of the Edit dialog selection. Existing fields are replaced in place; new fields without an ID are appended. Server validation remains unchanged.

## Evidence and local acceptance

- 17 tests passed across FormEditorFieldSave, FormFieldRulesDialog, FormFieldDialog, FormDraftIdentityValidation, and FormDraftCache.
- The four new regression cases passed again after adjusting the test harness to expose its controller in an effect.
- Regression coverage verifies rule saves with no Edit selection, a different stale Edit selection, existing-field updates, and new-field insertion. Submitted payloads pass the actual editor schema and retain field identities, order, version concurrency, and presentation settings.
- Focused ESLint, full TypeScript checking, architecture boundary, form architecture, component reuse, and diff whitespace checks passed.
- The controller is 185 lines per function; changed source and test files remain within the repository instructions' limits.

The local regression criteria above are satisfied. Browser and deployed acceptance remain unverified; no build, deployment, or database modification was performed.
