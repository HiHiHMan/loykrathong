# Loy Krathong — 20-user browser test

## What this test covers

- 20 isolated Chromium browser contexts (independent cookies and localStorage).
- Concurrent landing-page loads.
- Opening the create-wish flow and selecting a krathong.
- Filling the real form controls and submitting 20 unique test wishes concurrently.
- Opening the wishes page and verifying each session can read the wish it just saved.
- Uncaught browser JavaScript errors.

## Safety

The test uses the project's existing `?mock=1` mode. It does **not** write to the production Firebase Realtime Database. Mock data is isolated per browser context, so each simulated user has its own localStorage.

This validates the browser/UI journey and concurrent client behavior. It does not measure Firebase's real concurrent read/write capacity. A separate Firebase staging project and seeded test employee records are required before running a real-database write test.

## Install

```cmd
npm install
npx playwright install chromium
```

## Run locally

Run from the repository root:

```cmd
npm run test:browser:20
```

The Playwright config starts a local static server at `http://127.0.0.1:5500`.

Run with visible browser windows:

```cmd
npm run test:browser:20:headed
```

## Run against a deployed test site

```cmd
set BASE_URL=https://YOUR-TEST-HOST
npm run test:browser:20
```

Use a staging/test host. The test appends `?mock=1` to its page URLs.

## Report

```cmd
npm run test:report
```

HTML report, screenshots, traces, and videos are saved locally by Playwright. Do not commit generated report artifacts.
