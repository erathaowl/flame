const { test, expect } = require('@playwright/test');

const submit = async (page, method, route, locator) => {
  await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === route &&
      response.request().method() === method &&
      response.ok()
    ),
    locator.click(),
  ]);
};

const login = async (page) => {
  await page.goto('/settings/app');
  await page.getByLabel('Password').fill('e2e-only-password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText(/You are logged in/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/You are logged in/)).toBeVisible();
};

test('browser: empty applications can be opened', async ({ page }) => {
  await login(page);
  await page.goto('/applications');
  await expect(page.getByRole('heading', { name: 'All Applications' })).toBeVisible();
  await expect(page.getByText('No applications yet.')).toBeVisible();
  await page.getByText('Add', { exact: true }).click();
  await expect(page.getByLabel('App name')).toBeVisible();
  await page.goto('/applications');
  await expect(page.getByText('No applications yet.')).toBeVisible();
});

test('browser: application and bookmark management with YAML backup', async ({ page, browser }) => {
  await login(page);

  await test.step('enable custom sorting', async () => {
    await page.goto('/settings/general');
    await page.getByLabel('Sorting type').selectOption('orderId');
    await submit(page, 'PUT', '/api/config',
      page.getByRole('button', { name: 'Save changes' }));
    await expect(page.getByLabel('Sorting type')).toHaveValue('orderId');
  });

  await test.step('create and hide an application', async () => {
    await page.goto('/applications');
    await page.getByText('Add', { exact: true }).click();
    await page.getByLabel('App name').fill('Browser App');
    await page.getByLabel('App URL').fill('https://browser.example.com');
    await page.getByLabel('App icon').fill('server');
    await submit(page, 'POST', '/api/apps',
      page.getByRole('button', { name: 'Add new application' }));
    await page.reload();
    await expect(page.getByText('Browser App')).toBeVisible();

    await page.getByText('Edit', { exact: true }).click();
    await submit(page, 'PUT', '/api/apps/1',
      page.getByRole('button', { name: 'Hide Browser App' }));
    await expect(page.getByRole('button', { name: 'Show Browser App' })).toBeVisible();
  });

  await test.step('create a bookmark category and bookmark', async () => {
    await page.goto('/bookmarks');
    await page.getByText('Add Category', { exact: true }).click();
    await page.getByLabel('Category Name').fill('Browser Category');
    await submit(page, 'POST', '/api/categories',
      page.getByRole('button', { name: 'Add new category' }));
    await page.reload();

    await page.getByText('Add Bookmark', { exact: true }).click();
    await page.getByLabel('Bookmark Name').fill('Browser Bookmark');
    await page.getByLabel('Bookmark URL').fill('https://bookmark.example.com');
    await page.getByLabel('Bookmark Category').selectOption({ label: 'Browser Category' });
    await submit(page, 'POST', '/api/bookmarks',
      page.getByRole('button', { name: 'Add new bookmark' }));
    await page.reload();
    await expect(page.getByText('Browser Bookmark')).toBeVisible();
  });

  await test.step('export and restore YAML using the settings UI', async () => {
    await page.goto('/settings/backup');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export YAML' }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('flame-backup.yaml');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByLabel('Import YAML (replaces existing entries)')
      .setInputFiles(await download.path());
    await expect(page.getByText(/Imported \d+ applications/)).toBeVisible();

    await page.goto('/bookmarks');
    await expect(page.getByText('Browser Bookmark')).toBeVisible();
  });

  await test.step('guest access excludes the hidden application', async () => {
    const guest = await browser.newPage();
    try {
      await guest.goto('/applications');
      await expect(guest.getByText('Browser App')).toHaveCount(0);
    } finally {
      await guest.close();
    }
  });
});

test('browser: auto clock and weather appear side by side on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { 'Authorization-Flame': `Bearer ${token}` };
  const original = (await (await page.request.get('/api/config')).json()).data;

  await page.route('**/api/weather', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: [{ id: 1, tempC: 22, tempF: 72, cloud: 35, isDay: 1, conditionCode: 1000 }],
    }),
  }));

  try {
    const updated = await page.request.put('/api/config', {
      headers,
      data: { largeClock: true, clockSize: 'auto', WEATHER_API_KEY: 'test-weather-key' },
    });
    expect(updated.ok()).toBe(true);

    await page.goto('/');
    await expect(page.locator('#weather-icon')).toBeVisible();
    const clock = page.locator('header h1');
    await expect(clock).toHaveText(/^\\d{2}:\\d{2}:\\d{2}$/);
    await expect.poll(() => clock.evaluate((element) => {
      const weather = document.querySelector('[data-testid="weather-slot"]');
      if (!weather) return false;
      const clockBox = element.getBoundingClientRect();
      const weatherBox = weather.getBoundingClientRect();
      return Math.abs(clockBox.height - weatherBox.height) <= 2 &&
        clockBox.left < weatherBox.left &&
        clockBox.right <= weatherBox.left;
    })).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    const extraLarge = await page.request.put('/api/config', {
      headers,
      data: { clockSize: 'extra-large' },
    });
    expect(extraLarge.ok()).toBe(true);
    await page.reload();
    await expect(page.locator('header h1')).toHaveCSS('font-size', '88px');
  } finally {
    await page.request.put('/api/config', {
      headers,
      data: {
        largeClock: original.largeClock,
        clockSize: original.clockSize,
        WEATHER_API_KEY: original.WEATHER_API_KEY,
      },
    });
  }
});

test('browser: clock font selector lists installed fonts only', async ({ page }) => {
  await login(page);

  const fonts = await page.request.get('/api/clock-fonts');
  expect(fonts.ok()).toBe(true);
  expect(fonts.headers()['cache-control']).toMatch(/no-store/);
  expect(Array.isArray((await fonts.json()).data)).toBe(true);

  await page.route('**/api/clock-fonts', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: ['CF LCD 521.ttf', 'personal-display.otf'] }),
  }));
  await page.goto('/settings/interface');
  const selector = page.getByLabel('Font', { exact: true });
  await expect(selector.locator('option[value="jetbrains-mono"]')).toHaveCount(1);
  await expect(selector.locator('option[value="cf-lcd-521"]')).toHaveCount(1);
  await expect(selector.locator('option[value="lcddot"]')).toHaveCount(0);
  await expect(selector.locator('option[value="local:personal-display.otf"]')).toHaveCount(1);
});

test('browser: save quotes, quote styles and clock font in one form', async ({ page }) => {
  await login(page);
  await page.goto('/settings/interface');

  await page.getByLabel('Header layout').selectOption('1');
  await page.getByLabel('Font', { exact: true }).selectOption('jetbrains-mono');
  await page.getByLabel('Size', { exact: true }).selectOption('large');
  await page.getByLabel('Style', { exact: true }).selectOption('bold-italic');
  await page.getByLabel('Quote style').selectOption('italic-dimmed');

  const quotes = page.getByLabel('Quotes (one per line)');
  await quotes.fill('One deterministic browser quote');
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(1);
  await submit(page, 'PUT', '/api/interface',
    page.getByRole('button', { name: 'Save changes' }));
  await expect(page.getByText('Interface settings saved')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('header h1')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
  await expect(page.locator('header h1')).toHaveCSS('font-family', /JetBrainsMono Nerd Font/);
  await expect(page.locator('header h1')).toHaveCSS('font-size', '72px');
  await expect(page.locator('header h1')).toHaveCSS('font-weight', '700');
  await expect(page.locator('header h1')).toHaveCSS('font-style', 'italic');
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "JetBrainsMono Nerd Font"'))).toBe(true);
  const fontResponse = await page.request.get('/clock-fonts/JetBrainsMonoNerdFontMono-Regular.ttf');
  expect(fontResponse.status()).toBe(200);
  expect(fontResponse.headers()['content-type']).toMatch(/font|octet-stream/);
  expect(fontResponse.headers()['cache-control']).toMatch(/no-cache/);
  expect((await fontResponse.body()).length).toBeGreaterThan(1000);
  const missingFont = await page.request.get('/clock-fonts/missing-font.ttf');
  expect(missingFont.status()).toBe(404);
  const html = await page.request.get('/');
  expect(html.headers()['cache-control']).toMatch(/no-cache/);
  const stylesheet = await page.request.get('/clock-fonts.css');
  expect(stylesheet.headers()['cache-control']).toMatch(/no-cache/);
  const config = await page.request.get('/api/config');
  expect(config.headers()['cache-control']).toMatch(/no-store/);
  const quote = page.getByText('One deterministic browser quote');
  await expect(quote).toBeVisible();
  await expect(quote).toHaveCSS('font-style', 'italic');
  await expect(quote).toHaveCSS('opacity', '0.55');

  await page.goto('/settings/interface');
  await expect(page.getByLabel('Font', { exact: true })).toHaveValue('jetbrains-mono');
  await expect(page.getByLabel('Size', { exact: true })).toHaveValue('large');
  await expect(page.getByLabel('Style', { exact: true })).toHaveValue('bold-italic');
  await expect(page.getByLabel('Quote style')).toHaveValue('italic-dimmed');
  await page.getByLabel('Header layout').selectOption('0');
  await page.getByLabel('Size', { exact: true }).selectOption('small');
  await page.getByLabel('Style', { exact: true }).selectOption('normal');
  for (const [style, fontStyle, opacity] of [
    ['italic', 'italic', '1'],
    ['dimmed', 'normal', '0.55'],
    ['normal', 'normal', '1'],
  ]) {
    await page.getByLabel('Quote style').selectOption(style);
    await submit(page, 'PUT', '/api/interface',
      page.getByRole('button', { name: 'Save changes' }));
    await page.goto('/');
    const headline = page.locator('header h1');
    await expect(headline).toHaveText('One deterministic browser quote');
    await expect(headline).toHaveCSS('font-style', fontStyle);
    await expect(headline).toHaveCSS('opacity', opacity);
    await page.goto('/settings/interface');
  }

  await page.getByLabel('Header layout').selectOption('1');
  await submit(page, 'PUT', '/api/interface',
    page.getByRole('button', { name: 'Save changes' }));
  await page.goto('/');
  const clock = page.locator('header h1');
  await expect(clock).toHaveCSS('font-size', '40px');
  await expect(clock).toHaveCSS('font-weight', '400');
  await expect(clock).toHaveCSS('font-style', 'normal');
});

test('browser: keyboard reordering persists the new application order', async ({ page }) => {
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { 'Authorization-Flame': `Bearer ${token}` };

  const updated = await page.request.put('/api/config', {
    headers,
    data: { useOrdering: 'orderId' },
  });
  expect(updated.ok()).toBe(true);

  const createApp = async (name) => {
    const response = await page.request.post('/api/apps', {
      headers,
      data: {
        name,
        url: `https://${name.toLowerCase().replace(/ /g, '-')}.example.com`,
        icon: 'server',
        isPublic: true,
      },
    });
    expect(response.status()).toBe(201);
    return (await response.json()).data;
  };

  const alpha = await createApp('Reorder Alpha');
  const beta = await createApp('Reorder Beta');

  await page.goto('/applications');
  await page.getByText('Edit', { exact: true }).click();

  const handle = page.locator(
    `[data-rbd-drag-handle-draggable-id="${alpha.id}"]`
  );
  await expect(handle).toBeVisible();

  const saved = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/apps/0/reorder' &&
    response.request().method() === 'PUT' &&
    response.ok()
  );

  await handle.focus();
  await handle.press('Space');
  await handle.press('ArrowDown');
  await handle.press('Space');
  await saved;

  const response = await page.request.get('/api/apps', { headers });
  const apps = (await response.json()).data;
  const first = apps.findIndex((app) => app.id === beta.id);
  const second = apps.findIndex((app) => app.id === alpha.id);

  expect(first).toBeGreaterThanOrEqual(0);
  expect(second).toBe(first + 1);
});
