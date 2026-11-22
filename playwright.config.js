const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5005',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:5005/api/config',
    timeout: 45000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: '5005',
      PASSWORD: 'e2e-only-password',
      SECRET: 'e2e-only-secret',
      VERSION: '2.5.1',
      NODE_ENV: 'production',
    },
  },
});
