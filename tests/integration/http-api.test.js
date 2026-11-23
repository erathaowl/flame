const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');

const result = (success, timestamp) => ({ success, timestamp, status: success ? 200 : 503 });

test('HTTP API: authentication, management, monitoring, backup and rollback', async (t) => {
  const cwd = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'flame-http-'));
  const environment = {
    PASSWORD: process.env.PASSWORD,
    SECRET: process.env.SECRET,
    VERSION: process.env.VERSION,
  };
  let apiServer;
  let gatusServer;
  let db;

  try {
    await fs.mkdir(path.join(directory, 'data'));
    await fs.mkdir(path.join(directory, 'utils/init'), { recursive: true });
    await fs.copyFile(
      path.join(__dirname, '../../utils/init/initialConfig.json'),
      path.join(directory, 'utils/init/initialConfig.json')
    );
    process.chdir(directory);
    process.env.PASSWORD = 'test-password-only';
    process.env.SECRET = 'test-secret-only';
    process.env.VERSION = '2.5.1';

    db = require('../../db');
    await db.connectDB();
    require('../../models/associateModels')();
    const api = require('../../api');

    const serve = async (server) => {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      return `http://127.0.0.1:${server.address().port}`;
    };

    apiServer = http.createServer(api);
    const baseUrl = await serve(apiServer);

    const checks = new Map();
    gatusServer = http.createServer((req, res) => {
      checks.set(req.url, (checks.get(req.url) || 0) + 1);
      const key = req.url.split('/')[4];
      const states = {
        green: [result(true, '2026-11-22T19:00:00Z'), result(true, '2026-11-22T18:59:00Z')],
        yellow: [result(true, '2026-11-22T19:00:00Z'), result(false, '2026-11-22T18:59:00Z')],
        red: [result(false, '2026-11-22T19:00:00Z'), result(true, '2026-11-22T18:59:00Z')],
      };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ key, results: states[key] || [] }));
    });
    const gatusBase = await serve(gatusServer);
    const gatusUrl = (key) =>
      `${gatusBase}/api/v1/endpoints/${key}/statuses`;

    let token;
    const request = async (method, resource, data, authenticated = false) => {
      const headers = {};
      if (authenticated) headers['Authorization-Flame'] = `Bearer ${token}`;
      if (data !== undefined) {
        headers['Content-Type'] = typeof data === 'string'
          ? 'application/x-yaml'
          : 'application/json';
      }
      const response = await fetch(baseUrl + resource, {
        method,
        headers,
        body: data === undefined ? undefined :
          typeof data === 'string' ? data : JSON.stringify(data),
      });
      const body = await response.text();
      return {
        status: response.status,
        headers: response.headers,
        data: response.headers.get('content-type')?.includes('application/json')
          ? JSON.parse(body) : body,
      };
    };

    const ok = async (method, resource, data, authenticated = true, status = 200) => {
      const response = await request(method, resource, data, authenticated);
      assert.equal(response.status, status, `${method} ${resource}: ${JSON.stringify(response.data)}`);
      return response.data.data;
    };

    await t.test('guest permissions and login token validation', async () => {
      assert.equal((await request('GET', '/api/config')).status, 200);
      for (const [method, route, data] of [
        ['POST', '/api/apps', { name: 'Denied', url: 'https://denied.example.com' }],
        ['PUT', '/api/config', { useOrdering: 'orderId' }],
        ['PUT', '/api/quotes', { quotes: ['Denied'] }],
        ['PUT', '/api/interface', { config: {}, quotes: ['Denied'] }],
        ['GET', '/api/quotes'],
        ['GET', '/api/backup'],
        ['POST', '/api/backup', 'invalid: backup'],
      ]) {
        assert.equal((await request(method, route, data)).status, 401, route);
      }
      assert.equal((await request('POST', '/api/auth', {
        password: 'incorrect', duration: '1h',
      })).status, 401);
      assert.equal((await request('POST', '/api/auth/validate', {
        token: 'invalid',
      })).status, 401);
      const login = await ok('POST', '/api/auth', {
        password: process.env.PASSWORD, duration: '1h',
      }, false);
      token = login.token;
      assert.ok(token);
      assert.equal((await ok('POST', '/api/auth/validate', { token }, false)).token.isValid, true);
    });

    await t.test('typed settings, defaults and invalid updates', async () => {
      const original = await ok('GET', '/api/config');
      assert.equal(original.useOrdering, 'createdAt');
      const modified = await ok('PUT', '/api/config', {
        useOrdering: 'orderId', largeClock: true, hideHeader: true, lat: 45.5,
      });
      assert.equal(modified.largeClock, true);
      assert.equal(modified.hideHeader, true);
      assert.equal(modified.lat, 45.5);
      assert.equal((await ok('GET', '/api/config')).useOrdering, 'orderId');

      assert.equal((await request('PUT', '/api/config', {
        hideHeader: false, lat: 'invalid',
      }, true)).status, 400);
      assert.equal((await ok('GET', '/api/config')).hideHeader, true);
    });

    let apps;
    let categories;
    let bookmarks;
    await t.test('create entities, visibility rules and partial toggles', async () => {
      const first = await ok('POST', '/api/apps', {
        name: 'Public App', url: 'https://public.example.com',
        isPublic: true, statusEndpoint: gatusUrl('green'),
      }, true, 201);
      const second = await ok('POST', '/api/apps', {
        name: 'Private App', url: 'https://private.example.com',
        isPublic: false, statusEndpoint: gatusUrl('red'),
      }, true, 201);
      const third = await ok('POST', '/api/apps', {
        name: 'Yellow App', url: 'https://yellow.example.com',
        isPublic: true, statusEndpoint: gatusUrl('yellow'),
      }, true, 201);
      apps = [first, second, third];
      assert.deepEqual(apps.map((app) => app.orderId), [1, 2, 3]);

      const publicCategory = await ok('POST', '/api/categories', {
        name: 'Public Category', isPublic: true,
      }, true, 201);
      const privateCategory = await ok('POST', '/api/categories', {
        name: 'Private Category', isPublic: false,
      }, true, 201);
      categories = [publicCategory, privateCategory];

      const publicBookmark = await ok('POST', '/api/bookmarks', {
        name: 'Public Bookmark', url: 'https://bookmark.example.com',
        categoryId: publicCategory.id, isPublic: true,
      }, true, 201);
      const hiddenBookmark = await ok('POST', '/api/bookmarks', {
        name: 'Hidden Bookmark', url: 'https://hidden.example.com',
        categoryId: publicCategory.id, isPublic: false,
      }, true, 201);
      const insidePrivate = await ok('POST', '/api/bookmarks', {
        name: 'Private Category Bookmark', url: 'https://private-category.example.com',
        categoryId: privateCategory.id, isPublic: true,
      }, true, 201);
      bookmarks = [publicBookmark, hiddenBookmark, insidePrivate];

      assert.equal((await ok('GET', '/api/apps')).length, 3);
      assert.deepEqual((await ok('GET', '/api/apps', undefined, false))
        .map((app) => app.name).sort(), ['Public App', 'Yellow App']);
      assert.equal((await request('GET', `/api/apps/${second.id}`)).status, 404);
      assert.equal((await ok('GET', '/api/categories', undefined, false)).length, 1);
      assert.deepEqual((await ok('GET', '/api/categories', undefined, false))[0]
        .bookmarks.map((item) => item.name), ['Public Bookmark']);

      assert.deepEqual((await ok('GET', '/api/bookmarks', undefined, false))
        .map((item) => item.name), ['Public Bookmark']);
      assert.equal((await request('GET', `/api/bookmarks/${insidePrivate.id}`)).status, 404);
      assert.equal((await ok('GET', `/api/bookmarks/${insidePrivate.id}`)).name,
        'Private Category Bookmark');

      await ok('PUT', `/api/apps/${first.id}`, { isPublic: false });
      const changed = await ok('GET', `/api/apps/${first.id}`);
      assert.equal(changed.isPublic, 0);
      assert.equal(changed.orderId, first.orderId);
      await ok('PUT', `/api/apps/${first.id}`, { isPublic: true });

      await ok('PUT', `/api/bookmarks/${hiddenBookmark.id}`, { isPublic: true });
      const updated = await ok('GET', `/api/bookmarks/${hiddenBookmark.id}`);
      assert.equal(updated.categoryId, publicCategory.id);
      assert.equal(updated.orderId, hiddenBookmark.orderId);
      await ok('PUT', `/api/bookmarks/${hiddenBookmark.id}`, { isPublic: false });
    });

    await t.test('reorder endpoints reject invalid payloads and persist valid order', async () => {
      for (const [route, key, ids] of [
        ['/api/apps/0/reorder', 'apps', apps.map((item) => item.id)],
        ['/api/categories/0/reorder', 'categories', categories.map((item) => item.id)],
        ['/api/bookmarks/0/reorder', 'bookmarks', bookmarks.slice(0, 2).map((item) => item.id)],
      ]) {
        assert.equal((await request('PUT', route, { [key]: [
          { id: ids[0], orderId: 1 }, { id: ids[0], orderId: 2 },
        ] }, true)).status, 400);

        assert.equal((await request('PUT', route, { [key]: [
          { id: ids[0], orderId: 7 }, { id: ids[1], orderId: 1 },
        ] }, true)).status, 400);

        await ok('PUT', route, { [key]: ids.slice().reverse().map((id, index) => ({
          id, orderId: index + 1,
        })) });
      }

      assert.equal((await ok('GET', '/api/apps'))[0].name, 'Yellow App');
      assert.equal((await ok('GET', '/api/categories'))[0].name, 'Private Category');
      assert.deepEqual((await ok('GET', '/api/categories'))
        .find((item) => item.id === categories[0].id)
        .bookmarks.map((item) => item.name), ['Hidden Bookmark', 'Public Bookmark']);
    });

    await t.test('Gatus statuses, guest privacy and URL cache', async () => {
      const publicStatuses = await ok('GET', '/api/status', undefined, false);
      assert.equal(publicStatuses[apps[0].id], 'green');
      assert.equal(publicStatuses[apps[2].id], 'yellow');
      assert.equal(Object.hasOwn(publicStatuses, apps[1].id), false);

      const statuses = await ok('GET', '/api/status');
      assert.equal(statuses[apps[1].id], 'red');
      assert.equal(statuses[apps[0].id], 'green');

      await ok('GET', '/api/status');
      assert.equal(checks.get('/api/v1/endpoints/green/statuses'), 1);
      assert.equal(checks.get('/api/v1/endpoints/red/statuses'), 1);

      await ok('PUT', `/api/apps/${apps[2].id}`, {
        statusEndpoint: 'file:///etc/passwd',
      });
      assert.equal((await ok('GET', '/api/status'))[apps[2].id], 'yellow');
    });

    await t.test('quote catalog handles arbitrary length, empty state and validation', async () => {
      assert.equal((await ok('GET', '/api/quotes/random', undefined, false)), null);
      const quotes = Array.from({ length: 15 }, (_, index) => `Quote ${index + 1}`);
      assert.equal((await ok('PUT', '/api/quotes', { quotes })).count, 15);
      assert.deepEqual(await ok('GET', '/api/quotes'), quotes);
      assert.ok(quotes.includes(await ok('GET', '/api/quotes/random', undefined, false)));
      assert.equal((await request('PUT', '/api/quotes', {
        quotes: ['Valid', ''],
      }, true)).status, 400);
      assert.deepEqual(await ok('GET', '/api/quotes'), quotes);
      await ok('PUT', '/api/quotes', { quotes: [] });
      assert.equal((await ok('GET', '/api/quotes/random', undefined, false)), null);
    });

    await t.test('interface settings and quotes save together and roll back together', async () => {
      const invalid = await request('PUT', '/api/interface', {
        config: { quoteStyle: 'dimmed' },
        quotes: ['Valid quote', ''],
      }, true);
      assert.equal(invalid.status, 400);

      const updated = await ok('PUT', '/api/interface', {
        config: {
          quoteStyle: 'italic-dimmed',
          clockFont: '3270',
          largeClock: true,
        },
        quotes: ['First quote', 'Second quote'],
      });
      assert.equal(updated.clockFont, '3270');
      assert.equal(updated.quoteStyle, 'italic-dimmed');
      assert.equal(updated.largeClock, true);
      assert.deepEqual(await ok('GET', '/api/quotes'), ['First quote', 'Second quote']);

      const Quote = require('../../models/Quote');
      const originalBulkCreate = Quote.bulkCreate;
      try {
        Quote.bulkCreate = async () => {
          throw new Error('Simulated quote write failure');
        };
        const failed = await request('PUT', '/api/interface', {
          config: { quoteStyle: 'normal', clockFont: 'arial' },
          quotes: ['Replacement'],
        }, true);
        assert.equal(failed.status, 500);
      } finally {
        Quote.bulkCreate = originalBulkCreate;
      }

      const current = await ok('GET', '/api/config');
      assert.equal(current.quoteStyle, 'italic-dimmed');
      assert.equal(current.clockFont, '3270');
      assert.deepEqual(await ok('GET', '/api/quotes'), ['First quote', 'Second quote']);

      await fs.mkdir(path.join(directory, 'data/clock-fonts'), { recursive: true });
      await fs.writeFile(path.join(directory, 'data/clock-fonts/custom.ttf'), 'test-font');
      const font = await request('GET', '/clock-fonts/custom.ttf', undefined, false);
      assert.equal(font.status, 200);
    });

    await t.test('YAML export, malformed input and transactional rollback', async () => {
      const original = await request('GET', '/api/backup', undefined, true);
      assert.equal(original.status, 200);
      assert.match(original.headers.get('content-disposition'), /flame-backup.yaml/);
      const exported = yaml.load(original.data);
      assert.equal(exported.version, 1);
      assert.equal(exported.sorting, 'orderId');
      assert.equal(exported.applications.length, 3);
      assert.equal(exported.categories.length, 2);
      assert.equal(exported.categories.reduce((n, cat) => n + cat.bookmarks.length, 0), 3);
      assert.equal(exported.applications.find((app) => app.name === 'Private App').isPublic, false);
      assert.equal(exported.categories.find((cat) => cat.name === 'Public Category')
        .bookmarks.find((bookmark) => bookmark.name === 'Hidden Bookmark').isPublic, false);

      assert.equal((await request('POST', '/api/backup', 'invalid: yaml', true)).status, 400);
      assert.equal((await ok('GET', '/api/apps')).length, 3);

      const replacement = {
        ...exported,
        sorting: 'name',
        applications: [{
          name: 'Restored App', url: 'https://restored.example.com',
          description: 'Restored', icon: 'view-dashboard',
          statusEndpoint: gatusUrl('green'), isPublic: false, isPinned: true, orderId: 8,
        }],
        categories: [{
          name: 'Restored Category', isPublic: false, isPinned: true,
          orderId: 3, bookmarks: [{
            name: 'Restored Bookmark', url: 'https://restored-bookmark.example.com',
            icon: 'link', isPublic: false, orderId: 7,
          }],
        }],
      };

      const Bookmark = require('../../models/Bookmark');
      const bulkCreate = Bookmark.bulkCreate;
      try {
        Bookmark.bulkCreate = async () => {
          throw new Error('Simulated mid-import failure');
        };
        assert.equal((await request('POST', '/api/backup', yaml.dump(replacement), true)).status, 500);
      } finally {
        Bookmark.bulkCreate = bulkCreate;
      }
      assert.equal((await ok('GET', '/api/config')).useOrdering, 'orderId');
      assert.equal((await ok('GET', '/api/apps')).length, 3);
      assert.equal((await ok('GET', '/api/categories')).length, 2);

      const restored = await ok('POST', '/api/backup', yaml.dump(replacement));
      assert.deepEqual(restored, {
        applications: 1, categories: 1, bookmarks: 1,
      });
      assert.equal((await ok('GET', '/api/config')).useOrdering, 'name');
      assert.equal((await ok('GET', '/api/apps'))[0].name, 'Restored App');
      const restoredCategory = (await ok('GET', '/api/categories'))[0];
      assert.equal(restoredCategory.name, 'Restored Category');
      assert.equal(restoredCategory.bookmarks[0].name, 'Restored Bookmark');
      assert.equal(restoredCategory.bookmarks[0].isPublic, 0);
      assert.equal((await ok('GET', '/api/apps', undefined, false)).length, 0);

      await ok('DELETE', `/api/bookmarks/${restoredCategory.bookmarks[0].id}`);
      await ok('DELETE', `/api/categories/${restoredCategory.id}`);
      const latestApp = (await ok('GET', '/api/apps'))[0];
      await ok('DELETE', `/api/apps/${latestApp.id}`);
      assert.equal((await ok('GET', '/api/apps')).length, 0);
      assert.equal((await ok('GET', '/api/categories')).length, 0);
    });
  } finally {
    await Promise.all([
      apiServer && new Promise((resolve) => apiServer.close(resolve)),
      gatusServer && new Promise((resolve) => gatusServer.close(resolve)),
    ].filter(Boolean));
    if (db) await db.sequelize.close();
    process.chdir(cwd);
    for (const [name, value] of Object.entries(environment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await fs.rm(directory, { recursive: true, force: true });
  }
});
