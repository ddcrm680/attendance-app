/**
 * Playwright connects to the manually started frontend only.
 *
 * Start the single Next.js dev server separately from the frontend directory:
 *   npm run dev -- --hostname localhost --port 3000
 *
 * This configuration intentionally has no `webServer`; Playwright must never
 * start, stop, or otherwise manage a Next.js process or its .next directory.
 */
module.exports = {
  testDir: './frontend/e2e',
  outputDir: '.playwright-cli/test-results',
  reporter: 'line',
  timeout: 15_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
};
