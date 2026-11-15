# Stage 20 — Fresh navigation and non-destructive update notification

## Delivery

- Initial feature commit f37f62f1050f50fd53770b621a38aac65b32b855, deploy dep-dbspaodg1s2s73fqo4dg live.
- Final runtime commit 14a01e9dde0b5e5bb8c87f778b5815136f1762f0, deploy dep-dbsq9hrbc2fs73c91120 live on the exact commit.
- Only the existing isolated static service srv-dbhgs7fb9u1s73er8rl0 was deployed. Auto-deploy remains off.
- No backend/API/database/permissions/financial records or production deployment changed. No Render header configuration changed.

## Problem and implementation

Repeated post-deploy checks had received an older HTML shell at the normal root address. During this stage the first normal navigation and reload still lacked the new build meta tag. An independent public HTTP response also showed an edge-cache HIT with max-age=0, s-maxage=300 and the prior deployment's Last-Modified date. Browser-only cache bypass did not resolve that observation.

The service worker now handles only same-origin GET navigations, requests a fresh HTML URL with a transient _crm_shell parameter and cache:no-store, and leaves the visible address intact. It does not intercept API requests, cache financial data, purge unrelated caches or change versioned asset caching. The existing offline message remains available.

A build plugin emits a public schema-1 crm-version.json and a matching random build ID in the HTML. The application checks only this same-origin public manifest, without credentials, on start, online/visible events and once per minute while visible. Requests are deduplicated and bounded by a timeout. Invalid HTML rewrites, malformed manifests and network errors are ignored. Service worker registration uses updateViaCache:none.

A newer build produces a non-modal notice asking the user to save input before choosing Update or Later. It does not refresh a working page, steal focus or store project data. Later suppresses repeat notices for that same build within the tab. The explicit update link preserves the current path and adds the existing recovery parameter.

## Validation

- 88 frontend tests in 19 files passed, including version consistency, notice behavior, preserved input/focus, deferred notices, invalid/offline responses, concurrency/late-response cancellation and worker registration.
- After the CDN navigation refinement, all 7 directly affected tests passed. They check navigation-only interception and query preservation; API requests remain untouched.
- Changed-file oxlint and git diff --check passed. Flagged production builds passed; the existing large-chunk warning remains.
- Build output was checked for an identical ID in HTML and the version manifest.
- Real Chrome verification used the existing test employee session. After one recovery bootstrap to the newly deployed build, navigating to the normal https://tozon-crm-commercial-test.onrender.com/ address loaded build 6e41c3d18c42b5a8b65b8fd1b3fe99bd, matching the bootstrap build, with no recovery parameter in the visible address. The project overview and rooms section were accessible.

## Limits

An attempted Render dashboard inspection timed out before any settings interaction. A later browser action opening the test apartment also timed out. A repeat-release notification with a live calculator draft and a final screenshot could not be completed. Those behaviors are covered by automated tests but are not claimed as manually verified. No second artificial release was triggered solely to claim that result.

For a browser that has not yet installed this updated application/worker, one initial recovery navigation can still be needed. Normal-root freshness was verified after that bootstrap, not as an unconditional cure for every pre-existing browser/CDN cache. Existing draft recovery across authorized context checks remains separate from saving input before an explicit full-page reload.

The readiness code continues to report production_ready=false; prior technical readiness evidence does not authorize automatic company rollout or invent real partner/employee assignments. This stage addresses a confirmed interface-update blocker, not completion of the wider production migration.
