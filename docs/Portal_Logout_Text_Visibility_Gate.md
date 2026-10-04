# Portal logout text visibility

Date: 2026-10-04

The shared logout button now uses explicit white text at 80% opacity on dark
operations navigation, matching the adjacent help link. Hover increases it to
full white. Applicant navigation and light account menus retain navy text.
The ghost button's default navy color previously hid the operations label.

Architecture, form architecture, file-size, lint and type checks passed. Lint
reported 16 existing unrelated warnings and no errors. The five existing
portal/logout test files passed all 15 tests. Rendering the actual shared
button confirmed that class merging replaces the dark navy default with
`text-white/80` while the brand variant retains `text-brand-navy`.
The production build and `git diff --check` also passed.

Browser visual verification could not run because Chromium's system library
`libnspr4.so` is unavailable. No deployment or user visual acceptance is claimed.
The earlier full-suite application-list failure remains outside this change;
the full suite was not repeated for this color-only adjustment.
