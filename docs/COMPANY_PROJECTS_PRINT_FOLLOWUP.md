# Native print verification follow-up — 14 November 2026

Added a successful print regression test in WorkspaceOffer.test.jsx. It checks that initial preview does not print, a freshly validated frame prints once, duplicate load events do not print twice, and a second print still works when HTML is identical. All 4 tests in this file passed; git diff --check passed. This is test-only code and documentation; no new runtime deployment is needed.

The retained Chrome tab was found, but Page.captureScreenshot again timed out. The alternate documented DOM view returned the offer dialog and print control. Escape through the documented DOM surface timed out as well and reset the browser connection. Native print preview, PDF save and cancellation have not been conclusively observed. Manual closing/inspection of the browser's system print window is required before retrying. No business data or permissions changed.
