const { defineConfig } = require("@playwright/test");

const externalBaseURL = process.env.BASE_URL;
const baseURL = externalBaseURL || "http://127.0.0.1:5500";

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  ...(externalBaseURL ? {} : {
    webServer: {
      command: "npx http-server . -p 5500 -c-1 --silent",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  })
});
