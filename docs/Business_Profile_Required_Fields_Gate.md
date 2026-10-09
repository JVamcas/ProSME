# Required business details and establishment year display

Date: 2026-10-09

Registration number, trading name, number of employees, and year established
are now required in the business profile form and its shared Zod schema.
The existing create and update APIs use that schema, so missing, blank, and
whitespace-only values are rejected server-side. The application Entity
Details fields also require these values for completeness and submission.
Zero employees remains valid; existing whole-number, employee limit, and
establishment-year range validation remains in place.

Application answer formatting displays the canonical
`BUSINESS_ESTABLISHED_YEAR` value as `2020`, without thousands grouping. Other
numeric and currency fields retain their existing formatting. The correction
works with numeric and string values in captured application forms, including
previously submitted applications. Stored years and submission snapshots are
not rewritten.

The existing business form and field component moved to
`modules/businesses/ui`; the shared business dialog continues to use the same
React Hook Form and Zod validation flow.

Verification: all 49 focused tests in ten files passed, covering shared schema
validation, create/update API rejection before persistence, ownership and
permission checks, attached application field requirements and validation,
application answer formatting, form editing, completeness, and business dialog
entry points. Type checking, architecture/form architecture, file-size checks,
and diff whitespace checks passed. Lint completed with zero errors and 23
existing unrelated warnings. Changed implementation functions satisfy the
200-line limit.

No database migration is required. Production build, browser acceptance, and
deployment were not performed for this change.
