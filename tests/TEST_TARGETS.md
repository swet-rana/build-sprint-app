# Test deployment safety

Standalone integration and diagnostic scripts default to development:
`https://elegant-schnauzer-503.convex.cloud`.

Use `--convex-url URL` (or `--convex-url=URL`) to select a target.
The script-specific environment variable is also supported, followed by
`TEST_CONVEX_URL`, `VITE_CONVEX_URL`, and `CONVEX_URL`. The scripts do not
silently take a production target from `.env.local`.

Production requires the literal `--allow-prod` argument. Unknown deployments
are rejected. Local-only diagnostics validate an explicitly supplied target
but still do their work locally.

The phone HTML harnesses check their configured backend and page origin
before importing app code or loading the nested harness. Their explicit
browser flag is `?--allow-prod`, propagated to the nested frame.

`report-viewer.browser.mjs` is always dev-only, including with `--allow-prod`.
It creates its own fictional fixture upload and isolated browser context;
it never opens the first report in a real user's browser session.

`node tests/check-production-refusals.mjs` checks every standalone entry point
against production without the permission flag. Child-process network access
is blocked. The HTML module guards are executed locally, before app imports.
Ordinary `npm test` uses local fixtures and mocked transports, not live data.
