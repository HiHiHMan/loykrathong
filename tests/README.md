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

## Synthetic employee records (20 users)

The file `tests/fixtures/employees.json` contains 20 fictional records with unique numeric employee codes `99000001`–`99000020`. Names are clearly marked as system-test users and all records use the existing valid department option `แผนกพัฒนาระบบงาน DC.`.

These records are test fixtures only; they have **not** been written to the production Firebase project.

For a real Firebase staging test:

1. Create/use a separate Firebase project for staging. Do not use the production project.
2. In the staging Realtime Database, import the JSON file as the value of the `Emps` node (Firebase Console → Realtime Database → Import JSON while `Emps` is selected).
3. Confirm the records appear under `Emps` and each has `employeeCode`, `fullName`, and `department`.
4. Configure the staging website to use the staging Firebase project before running a real-database test.

The browser test in this branch still runs with `?mock=1` and does not query `Emps`; the fixture provides consistent identities for the simulated users and can seed a separate staging database when that next test is prepared.
