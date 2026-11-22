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

test('browser: quote library and large clock layout', async ({ page }) => {
  await login(page);
  await page.goto('/settings/interface');

  await page.getByLabel('Header layout').selectOption('1');
  await submit(page, 'PUT', '/api/config',
    page.getByRole('button', { name: 'Save changes' }));

  const quotes = page.getByLabel('Quotes (one per line)');
  await quotes.fill('One deterministic browser quote');
  await submit(page, 'PUT', '/api/quotes',
    page.getByRole('button', { name: 'Save quotes' }));
  await expect(page.getByText('Saved 1 quotes')).toBeVisible();

  await page.goto('/');
  await expect(page.locator('header h1')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
  await expect(page.getByText('One deterministic browser quote')).toBeVisible();

  await page.goto('/settings/interface');
  await page.getByLabel('Header layout').selectOption('0');
  await submit(page, 'PUT', '/api/config',
    page.getByRole('button', { name: 'Save changes' }));
  await page.goto('/');
  await expect(page.locator('header h1')).toHaveText('One deterministic browser quote');
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
