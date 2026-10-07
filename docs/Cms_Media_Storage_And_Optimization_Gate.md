# CMS media storage and image optimization

Date: 2026-10-05

Historical gate record. The 7 October WebP-only delivery, persistent caches and
local regeneration supersede its optimizer-delivery behavior. See the
[image remediation follow-up](Public_Route_Performance_Investigation.md#image-remediation-follow-up-7-october-2026)
for current implementation evidence and deployment limits.

## Scope and resulting behavior

- All new uploads and replacement files receive a fresh `media/<UUID>` folder
  under `gs://smepro/<environment>/cms/`. Metadata saves preserve valid UUID
  folders. Flat-folder preservation is removed; records without a valid folder
  require forward migration or replacement before a metadata-only save.
- Payload generates thumbnail, mobile, tablet, and desktop sizes at maximum
  widths 320, 640, 1024, and 1600 without enlargement. Variant filenames include
  the size name, so two variants with identical dimensions cannot overwrite
  each other during upload.
- Normal raster images require generated variants for public delivery through
  Next's optimizer. The original-only compatibility path is removed. SVGs and
  originals below the minimum thumbnail width remain valid image formats.
- Next's local image allow-list accepts storage-prefix query parameters only
  for `/api/media/file/**`; ordinary static image paths retain their existing
  query restrictions.
- `npm run cms:migrate:media --workspace @prosme/platform` invokes an
  operator-only, forward-only migration. It preserves media IDs and content
  relationships, regenerates variants through Payload, verifies original bytes
  and generated object availability, then removes superseded copies.
- The explicit `--restore-source-files` option supplies four checked-in
  originals. Each must match its record's filename, byte size, width, and height
  before any replacement. This is migration input, not runtime compatibility.
- No schema changes, reverse migration, or rollback command were added.

## Live local evidence

- Database record 165 (`pic7.png`) was created on 30 September and updated on
  5 October; the old folder-preservation rule explains the flat objects shown
  in the user's screenshot. The running container had the UUID creation hook
  and composite-prefix configuration.
- All six local media records (2, 3, 161, 162, 165, 166) now have UUID prefixes
  and all four generated sizes. Their IDs were preserved.
- Missing originals for records 2, 3, 161, and 162 were restored from repository
  files with exactly matching file metadata. Original bytes and generated GCS
  objects were verified by the migration.
- The final migration invocation used the runtime account and completed with
  one migrated record, five already completed records, and zero failures.
- Five obsolete flat `pic7` objects were removed after their UUID copies were
  verified. No unrelated bucket objects were removed.
- With user approval, `roles/storage.objectUser` was granted to
  `firebase-adminsdk-fbsvc@smefund-dev.iam.gserviceaccount.com` with condition
  `resource.name.startsWith("projects/_/buckets/smepro/objects/local/cms/")`.
  The grant is on project `msmepro`: bucket-level conditions were rejected
  because the bucket allows object ACLs. Existing bucket access settings were
  preserved. The condition and principal were read back for verification.
  [GCS condition support](https://docs.cloud.google.com/storage/docs/access-control/iam#conditions)
- A live request to Next's optimizer with a prefixed media URL returned 400,
  `"url" parameter is not allowed`. The running image restricts all local image
  URLs to an empty query. The source allow-list fix is tested but has not been
  deployed.

## Validation and delivery limits

- Focused content, CMS image, and optimizer configuration tests: 19 files,
  97 tests passed.
- Type checking passed.
- Changed application files passed targeted lint.
- Architecture and form architecture passed for 1,445 source files.
- File-size checks passed for 2,120 handwritten files.
- No production build, Chromium run, app restart, or Docker rebuild was done,
  per the user's instruction. No full-suite or visual acceptance is claimed.
- Source changes require a later deployment; live data migration and the IAM
  grant are already applied. Wider CMS phase acceptance remains separate.
