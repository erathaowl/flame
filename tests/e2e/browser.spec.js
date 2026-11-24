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

test('browser: bundled LCD faces load correctly', async ({ page }) => {
  await login(page);

  await page.goto('/settings/clock');
  const fontSelector = page.getByLabel('Font', { exact: true });
  await expect(fontSelector.locator('option[value="dseg7"]')).toHaveCount(1);
  await expect(fontSelector.locator('option[value="doto"]')).toHaveCount(0);
  await expect(fontSelector.locator('option[value="matrix-mono-screen"]')).toHaveCount(1);

  for (const filename of [
    'DSEG7Classic-Regular.woff2',
    'DSEG7Classic-Bold.woff2',
    'MatrixMonoScreen-Regular.ttf',
  ]) {
    const response = await page.request.get(`/clock-fonts/${filename}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/font|octet-stream/);
    expect((await response.body()).length).toBeGreaterThan(1000);
  }

  await page.goto('/');
  const loaded = await page.evaluate(async () => {
    const dseg = await document.fonts.load('400 50px "DSEG7 Classic"', '0123456789:');
    const dsegBold = await document.fonts.load('700 50px "DSEG7 Classic"', '0123456789:');
    const matrix = await document.fonts.load('400 50px "Matrix Mono Screen"', '0123456789:');
    return [dseg.length, dsegBold.length, matrix.length];
  });
  expect(loaded).toEqual([1, 1, 1]);

  const removed = await page.request.get('/clock-fonts/Doto.woff2');
  expect(removed.status()).toBe(404);
});

test('browser: removed clock font uses Matrix Mono Screen', async ({ page }) => {
  await login(page);

  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { 'Authorization-Flame': `Bearer ${token}` };
  const original = (await (await page.request.get('/api/config')).json()).data;

  try {
    const updated = await page.request.put('/api/config', {
      headers,
      data: { largeClock: true, clockFont: 'doto' },
    });
    expect(updated.ok()).toBe(true);

    await page.goto('/');
    await expect(page.locator('header h1')).toHaveCSS('font-family', /Matrix Mono Screen/);

    await page.goto('/settings/clock');
    const selector = page.getByLabel('Font', { exact: true });
    await expect(selector).toHaveValue('matrix-mono-screen');
    await expect(selector.locator('option[value="doto"]')).toHaveCount(0);
  } finally {
    await page.request.put('/api/config', {
      headers,
      data: {
        largeClock: original.largeClock,
        clockFont: original.clockFont,
      },
    });
  }
});

test('browser: square-dot clock font renders digits and separators', async ({ page }) => {
  await login(page);

  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { 'Authorization-Flame': `Bearer ${token}` };
  const original = (await (await page.request.get('/api/config')).json()).data;

  try {
    const updated = await page.request.put('/api/config', {
      headers,
      data: { largeClock: true, clockFont: 'matrix-mono-screen', clockStyle: 'bold' },
    });
    expect(updated.ok()).toBe(true);

    await page.goto('/');
    const clock = page.locator('header h1');
    await expect(clock).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    await expect(clock).toHaveCSS('font-family', /Matrix Mono Screen/);
    await expect(clock).toHaveCSS('font-synthesis', 'none');

    const loaded = await page.evaluate(async () => {
      await document.fonts.load('400 60px "Matrix Mono Screen"', '0123456789:');
      const font = [...document.fonts].find(
        (face) => face.family === 'Matrix Mono Screen'
      );
      return font?.status === 'loaded' &&
        document.fonts.check('400 60px "Matrix Mono Screen"', '0123456789:');
    });
    expect(loaded).toBe(true);
  } finally {
    await page.request.put('/api/config', {
      headers,
      data: {
        largeClock: original.largeClock,
        clockFont: original.clockFont,
        clockStyle: original.clockStyle,
      },
    });
  }
});

test('browser: quote, settings link and LCD clock remain separate on mobile', async ({ browser }) => {
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  await login(page);

  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { 'Authorization-Flame': `Bearer ${token}` };
  const original = (await (await page.request.get('/api/config')).json()).data;

  try {
    for (const font of ['dseg7', 'matrix-mono-screen']) {
      const updated = await page.request.put('/api/config', {
        headers,
        data: { largeClock: true, clockSize: 'extra-large', clockFont: font },
      });
      expect(updated.ok()).toBe(true);
      await page.goto('/');

      const layout = await page.evaluate(() => {
        const quote = document.querySelector('header p');
        const settings = document.querySelector('header a[href="/settings"]');
        const clock = document.querySelector('header h1');
        if (!quote || !settings || !clock) return null;
        return {
          quoteBottom: quote.getBoundingClientRect().bottom,
          settingsTop: settings.getBoundingClientRect().top,
          settingsBottom: settings.getBoundingClientRect().bottom,
          clockTop: clock.getBoundingClientRect().top,
          clockFamily: window.getComputedStyle(clock).fontFamily,
          clockRowMarginTop: window.getComputedStyle(clock.parentElement).marginTop,
          clockRowMarginBottom: window.getComputedStyle(clock.parentElement).marginBottom,
          viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
          touchAction: window.getComputedStyle(document.documentElement).touchAction,
        };
      });

      expect(layout).not.toBeNull();
      expect(layout.settingsTop - layout.quoteBottom).toBeGreaterThanOrEqual(16);
      expect(layout.clockTop - layout.settingsBottom).toBeGreaterThanOrEqual(16);
      expect(layout.clockRowMarginTop).toBe('20px');
      expect(layout.clockRowMarginBottom).toBe('20px');
      expect(layout.clockFamily).toContain(font === 'dseg7' ? 'DSEG7 Classic' : 'Matrix Mono Screen');
      expect(layout.viewportMeta).toContain('user-scalable=no');
      expect(layout.viewportMeta).toContain('maximum-scale=1');
      expect(layout.touchAction).toBe('pan-x pan-y');
    }
  } finally {
    await page.request.put('/api/config', {
      headers,
      data: {
        largeClock: original.largeClock,
        clockSize: original.clockSize,
        clockFont: original.clockFont,
      },
    });
    await page.close();
  }
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
    await expect(clock).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
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
  await page.goto('/settings/clock');
  const selector = page.getByLabel('Font', { exact: true });
  await expect(selector.locator('option[value="jetbrains-mono"]')).toHaveCount(1);
  await expect(selector.locator('option[value="cf-lcd-521"]')).toHaveCount(1);
  await expect(selector.locator('option[value="lcddot"]')).toHaveCount(0);
  await expect(selector.locator('option[value="local:personal-display.otf"]')).toHaveCount(1);
});

test('browser: clock and quotes have independent settings sections', async ({ page }) => {
  await login(page);

  await page.goto('/settings/clock');
  await page.getByLabel('Header layout').selectOption('large');
  await page.getByLabel('Font', { exact: true }).selectOption('jetbrains-mono');
  await page.getByLabel('Size', { exact: true }).selectOption('large');
  await page.getByLabel('Style', { exact: true }).selectOption('bold-italic');
  await submit(page, 'PUT', '/api/config',
    page.getByRole('button', { name: 'Save changes' }));

  await page.goto('/settings/quotes');
  await expect(page.getByLabel('Quote source')).toHaveValue('local');
  await page.getByLabel('Quote style').selectOption('italic-dimmed');
  await page.getByLabel('Quotes (one per line)').fill('One deterministic browser quote');
  await submit(page, 'PUT', '/api/interface',
    page.getByRole('button', { name: 'Save changes' }));
  await expect(page.getByText('Quote settings saved')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('header h1')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
  await expect(page.locator('header h1')).toHaveCSS('font-family', /JetBrainsMono Nerd Font/);
  await expect(page.locator('header h1')).toHaveCSS('font-size', '72px');
  await expect(page.locator('header h1')).toHaveCSS('font-weight', '700');
  await expect(page.locator('header h1')).toHaveCSS('font-style', 'italic');
  await expect(page.getByText('One deterministic browser quote')).toHaveCSS('opacity', '0.55');

  await page.goto('/settings/clock');
  await expect(page.getByLabel('Font', { exact: true })).toHaveValue('jetbrains-mono');
  await expect(page.getByLabel('Size', { exact: true })).toHaveValue('large');
  await page.getByLabel('Header layout').selectOption('small');
  await page.getByLabel('Size', { exact: true }).selectOption('small');
  await page.getByLabel('Style', { exact: true }).selectOption('normal');
  await submit(page, 'PUT', '/api/config',
    page.getByRole('button', { name: 'Save changes' }));

  for (const [style, fontStyle, opacity] of [
    ['italic', 'italic', '1'],
    ['dimmed', 'normal', '0.55'],
    ['normal', 'normal', '1'],
  ]) {
    await page.goto('/settings/quotes');
    await page.getByLabel('Quote style').selectOption(style);
    await submit(page, 'PUT', '/api/interface',
      page.getByRole('button', { name: 'Save changes' }));
    await page.goto('/');
    const headline = page.locator('header h1');
    await expect(headline).toHaveText('One deterministic browser quote');
    await expect(headline).toHaveCSS('font-style', fontStyle);
    await expect(headline).toHaveCSS('opacity', opacity);
  }

  await page.goto('/settings/clock');
  await page.getByLabel('Header layout').selectOption('large');
  await submit(page, 'PUT', '/api/config',
    page.getByRole('button', { name: 'Save changes' }));
  await page.goto('/');
  const clock = page.locator('header h1');
  await expect(clock).toHaveCSS('font-size', '40px');
  await expect(clock).toHaveCSS('font-weight', '400');
  await expect(clock).toHaveCSS('font-style', 'normal');
});

test('browser: clock colors follow theme and preserve custom HEX values', async ({ page }) => {
  await login(page);
  await page.goto('/settings/clock');
  await page.getByLabel('Header layout').selectOption('large');
  await page.getByLabel('Hours').selectOption('secondary');
  await page.getByLabel('Minutes').selectOption('custom');
  await page.getByLabel('HEX color for minutes').fill('#123456');
  await page.getByLabel('Seconds').selectOption('tertiary-dimmed');
  await submit(page, 'PUT', '/api/config',
    page.getByRole('button', { name: 'Save changes' }));

  await page.goto('/');
  await expect(page.locator('header h1 span').nth(0)).toHaveCSS('color', /rgb/);
  await expect(page.locator('header h1 span').nth(2)).toHaveCSS('color', 'rgb(18, 52, 86)');
  await page.goto('/settings/clock');
  await expect(page.getByLabel('Minutes')).toHaveValue('custom');
  await expect(page.getByLabel('HEX color for minutes')).toHaveValue('#123456');
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
