const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadController(filename, model, sequelize) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', filename),
    'utf8'
  );
  const module = { exports: {} };
  const dependencies = {
    '../../middleware/asyncWrapper': (handler) => handler,
    '../../models/App': model,
    '../../models/Bookmark': model,
    '../../models/Category': model,
    '../../db': { sequelize },
    '../../utils/loadConfig': async () => ({
      pinAppsByDefault: true,
      pinCategoriesByDefault: true,
    }),
    '../../utils/ErrorResponse': Error,
  };
  const wrapper = vm.runInNewContext(
    '(function (require, module) { ' + source + '\n})'
  );
  wrapper((name) => {
    if (!Object.hasOwn(dependencies, name)) {
      throw new Error('Unexpected dependency: ' + name);
    }
    return dependencies[name];
  }, module);
  return module.exports;
}

function response() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
}

for (const [name, endpoint] of [
  ['apps', 'Apps'],
  ['bookmarks', 'Bookmarks'],
  ['categories', 'Categories'],
]) {
  test(`${name}: waits for all updates before responding`, async () => {
    const completed = [];
    let committed = false;
    const model = {
      async update(data, options) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        assert.ok(options.transaction);
        completed.push({ ...data, id: options.where.id });
      },
    };
    const sequelize = {
      async transaction(callback) {
        await callback({ id: 1 });
        committed = true;
      },
    };
    const handler = loadController(
      `controllers/${name}/reorder${endpoint}.js`,
      model,
      sequelize
    );
    const res = response();
    await handler({
      body: {
        [name]: [
          { id: 2, orderId: 1 },
          { id: 1, orderId: 2 },
        ],
      },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.success, true);
    assert.equal(completed.length, 2);
    assert.equal(committed, true);
    assert.deepEqual(completed.map((row) => row.id), [2, 1]);
  });

  test(`${name}: rejects duplicate IDs before writing`, async () => {
    const model = {
      update() {
        throw new Error('Unexpected write');
      },
    };
    const handler = loadController(
      `controllers/${name}/reorder${endpoint}.js`,
      model,
      { transaction() { throw new Error('Unexpected transaction'); } }
    );
    const res = response();
    await handler({
      body: {
        [name]: [
          { id: 1, orderId: 1 },
          { id: 1, orderId: 2 },
        ],
      },
    }, res);
    assert.equal(res.statusCode, 400);
  });
}

test('bookmark visibility update preserves the existing category', async () => {
  let updated = null;
  const model = {
    async findOne() {
      return {
        async update(data) {
          updated = data;
          return data;
        },
      };
    },
  };
  const handler = loadController(
    'controllers/bookmarks/updateBookmark.js',
    model
  );
  const res = response();
  await handler({
    params: { id: '1' },
    body: { isPublic: false },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(updated.isPublic, false);
  assert.equal(Object.hasOwn(updated, 'categoryId'), false);
});

for (const [name, file, data] of [
  ['apps', 'controllers/apps/createApp.js', { name: 'App' }],
  ['bookmarks', 'controllers/bookmarks/createBookmark.js', { categoryId: 5 }],
  ['categories', 'controllers/categories/createCategory.js', { name: 'Category' }],
]) {
  test(`${name}: new records append to the existing custom order`, async () => {
    let created = null;
    const model = {
      async max() { return 7; },
      async create(data) {
        created = data;
        return data;
      },
    };
    const handler = loadController(file, model);
    const res = response();
    await handler({ body: data }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(created.orderId, 8);
  });
}
