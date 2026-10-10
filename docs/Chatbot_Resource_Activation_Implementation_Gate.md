# Chatbot resources and automatic updates

Owner revision: October 10, 2026. This replaces the earlier manual knowledge
preview/approval/publication flow. The application's publication is sufficient.
No cloud configuration or deployment is included in this change.

The Knowledge base page now lists published resources in the existing DataTable:
resource name using ArrowLink, Funding/Eligibility/FAQ/Contact type, Active or
Inactive status, and Last updated. Funding and Eligibility links open the call's
public pages; FAQ links open the exact CMS entry; Contact links open /contact.
Last updated comes from the published source, independently of activation edits.
The shared Checkbox and Pagination components are reused. Pagination returns
one SQL page and its total count; page changes replace rows and clear selection.
Bulk Activate and Deactivate apply to checked rows on the current page.

Server operations require knowledge read permission plus the specific activation
or deactivation permission. SQL rejects unpublished/private sources and projects
only resource metadata. Activation/deactivation and before-state audit writes are
atomic. Concurrent policy changes serialize their before-state records.

Repeatable migration 0192 adds activation flags and audit, preserves sources
from an existing active knowledge version and retains equivalent existing
publication/withdrawal role grants. New resources default to inactive. Repeating
the migration preserves choices. Applying this migration to the application
database remains a deployment step; only disposable test databases were migrated.

Active Funding and Eligibility are independently controlled. Eligibility derives
public SELF_CHECK/BOTH guidance from the exact ruleset version bound to the call's
publication, including a still-bound retired version. It never reads the working
draft binding. Contact exports only published programme email, phone, address and
office hours. Editor notes and visitor follow-up contact information are excluded.

The processor and request-time refresh automatically generate verified immutable
knowledge files from active published resources. Existing release envelopes and
storage checks are reused internally; no staff must approve those generated
files. The internal acceptance audit is SOURCE_PUBLICATION_ACCEPTED, representing
the existing application publication rather than an invented human review.
Legacy manual prepare/approve/publish/withdraw HTTP actions reject requests with
instructions to use resource activation instead.

Published updates automatically replace the generated version. Unpublication and
deletion remove content. Inactive edits do not change the generated content.
Unsupported/conflicting passages are omitted without inventing guidance. Resource
and file bounds remain enforced. Upload verification, pinned generations, retries,
atomic activation and cross-instance cache checks remain. Deactivation takes
effect at response validation even before the next file refresh. Retried answers
also verify the current generated version.

Validation recorded on October 10, 2026:

- All 123 chatbot unit tests passed, including resource links, all four types,
  bulk selection and replacement of rows and selection on page changes.
- All 47 chatbot PostgreSQL integration tests passed against a disposable
  synthetic PostgreSQL 16 database. Resource pagination covered 128 published
  resources across pages of 50/50/28/0, stable ordering, no overlap and total
  counts. Other checks covered protected GET/PATCH, draft/private exclusion,
  repeatable migration, atomic audit rollback, concurrent changes, exact retired
  eligibility bindings, automatic publication refresh, partial upload/retry,
  concurrent synchronization and deactivation during an in-flight response.
- Type checking, architecture boundaries, form architecture, component reuse
  and file-size checks passed. Lint completed with zero errors and 24 warnings
  outside the changed chatbot resource implementation.
- The 21 affected resource UI/route and retired-workflow route tests passed
  again after the final type fix. Component reuse regression checks passed.
- Working-tree and staged whitespace checks passed.

This records local automated evidence, not written product acceptance. No
production build, application-database migration, deployment, browser acceptance
or live GCS/provider verification ran. The resource table and automatic-update
behavior still require content-owner acceptance in the deployed application.
