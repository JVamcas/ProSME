# Chatbot document PDF runtime fix

Date: 2026-10-12

The reported upload failure occurs when PDF.js cannot load `@napi-rs/canvas`
and its `DOMMatrix`, `ImageData` and `Path2D` polyfills. The installed
`pdf-parse` dependency already requires canvas, but PDF.js loads it through
`process.getBuiltinModule("module").createRequire(...)`. The runtime container
copies Next.js standalone output rather than the full installed dependency tree.
The upload route previously traced the PDF worker explicitly but omitted canvas.

The upload route now explicitly traces the canvas JavaScript package and installed
platform binary packages, including their package manifests. PDF parsing loads
only inside the PDF extraction branch and its validation error boundary, keeping
TXT and DOCX extraction usable if PDF runtime loading fails. No dependency
versions, upload permissions, activation rules or storage behavior changed.

Next.js documents explicit includes for dependencies and runtime assets missed by
[output file tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

## Local evidence

- 18 focused tests passed across document extraction, parser isolation, protected
  upload/preview routes and runtime packaging.
- The packaging test copies the PDF packages into a temporary directory and adds
  canvas solely through the configured tracing patterns. The copied parser
  extracts the real synthetic PDF fixture successfully, with the installed native
  binary included. This verifies dependency availability independently of the
  application dependency directory, but does not verify generated standalone output.
- Parser isolation tests simulate an unavailable PDF module: TXT and DOCX still
  extract, while PDF extraction returns the existing readable validation error.
- Architecture, form architecture, component reuse and file-size checks passed.
- Full lint passed with 26 existing warnings and no errors.
- Full TypeScript checking passed with a bounded 3 GiB Node heap.

## Acceptance boundaries

The running container was not inspected or rebuilt. The missing canvas package in
its standalone output is inferred from the reported `/workspace` error, loader
code, Docker copy path and tracing configuration. A production build, deployment,
live upload and browser acceptance remain unverified. No client acceptance is
claimed. The affected container needs a rebuild and redeployment to use the fix.
