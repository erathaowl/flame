const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const defaults = require('../utils/init/initialConfig.json');
const ErrorResponse = require('../utils/ErrorResponse');

const load = (filename, dependencies) => {
  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const module = { exports: {} };
  const factory = vm.runInNewContext(
    '(function (require, module) { ' + source + '\n})'
  );
  factory((name) => {
    if (!Object.hasOwn(dependencies, name)) {
      throw new Error('Unexpected dependency: ' + name);
    }
    return dependencies[name];
  }, module);
  return module.exports;
};

const createStore = () => {
  let records = new Map();
  const Setting = {
    async findAll({ transaction } = {}) {
      return [...(transaction ? transaction.records : records).values()];
    },
    async upsert(row, { transaction }) {
      if (!transaction) throw new Error('Transaction required');
      if (row.key === 'forceFailure') throw new Error('Database write failed');
      transaction.records.set(row.key, { ...row });
    },
  };
  const sequelize = {
    async transaction(callback) {
      const transaction = { records: new Map(records) };
      const result = await callback(transaction);
      records = transaction.records;
      return result;
    },
  };
  const getConfig = load('utils/loadConfig.js', {
    '../models/Setting': Setting,
    './init/initialConfig.json': defaults,
  });
  const saveConfig = load('utils/saveConfig.js', {
    '../db': { sequelize },
    '../models/Setting': Setting,
    './init/initialConfig.json': defaults,
    './ErrorResponse': ErrorResponse,
  });
  return { sequelize, getConfig, saveConfig };
};

test('settings: defaults and typed values survive updates', async () => {
  const { getConfig, saveConfig } = createStore();
  assert.equal((await getConfig()).useOrdering, 'createdAt');

  await saveConfig({ hideHeader: true, lat: 45.42, customTitle: 'My Flame' });
  await saveConfig({ useOrdering: 'orderId' });
  const config = await getConfig();

  assert.equal(config.hideHeader, true);
  assert.equal(config.lat, 45.42);
  assert.equal(config.customTitle, 'My Flame');
  assert.equal(config.useOrdering, 'orderId');
  assert.equal(config.long, 0);
});

test('settings: invalid input does not persist partial updates', async () => {
  const { getConfig, saveConfig } = createStore();
  await assert.rejects(
    saveConfig({ hideHeader: true, lat: 'invalid' }),
    /Invalid configuration value for lat/
  );
  assert.equal((await getConfig()).hideHeader, false);
});

test('settings: a failed transaction rolls back all values', async () => {
  const { getConfig, saveConfig } = createStore();
  await assert.rejects(
    saveConfig({ hideHeader: true, forceFailure: 'trigger' }),
    /Database write failed/
  );
  assert.equal((await getConfig()).hideHeader, false);
});

test('settings: external transactions commit and roll back together', async () => {
  const { sequelize, getConfig, saveConfig } = createStore();

  await assert.rejects(
    sequelize.transaction(async (transaction) => {
      await saveConfig({ useOrdering: 'orderId' }, transaction);
      assert.equal((await getConfig(transaction)).useOrdering, 'orderId');
      throw new Error('Import failed');
    }),
    /Import failed/
  );
  assert.equal((await getConfig()).useOrdering, 'createdAt');

  await sequelize.transaction(async (transaction) => {
    await saveConfig({ useOrdering: 'name' }, transaction);
  });
  assert.equal((await getConfig()).useOrdering, 'name');
});

const migration = (readFile) => load('db/migrations/08_settings.js', {
  'fs/promises': { readFile },
  '../../utils/init/initialConfig.json': defaults,
});

const migrationQuery = () => {
  const calls = { sql: null, rows: null, committed: false };
  const query = {
    sequelize: {
      async transaction(callback) {
        const transaction = {};
        await callback(transaction);
        calls.committed = true;
      },
      async query(sql, { transaction }) {
        assert.ok(transaction);
        calls.sql = sql;
      },
    },
    async bulkInsert(table, rows, { transaction }) {
      assert.ok(transaction);
      assert.equal(table, 'settings');
      calls.rows = rows;
    },
  };
  return { calls, query };
};

test('migration: imports legacy configuration and keeps defaults', async () => {
  const { calls, query } = migrationQuery();
  const run = migration(async () => JSON.stringify({
    hideHeader: true,
    lat: 42.5,
    customTitle: 'Existing dashboard',
    extraLegacySetting: 'preserved',
  }));
  await run.up(query);

  const rows = Object.fromEntries(calls.rows.map((row) => [row.key, row]));
  assert.equal(calls.committed, true);
  assert.match(calls.sql, /CHECK.*valueType|valueType.*CHECK/s);
  assert.equal(rows.hideHeader.valueType, 'boolean');
  assert.equal(rows.hideHeader.value, 'true');
  assert.equal(rows.lat.valueType, 'number');
  assert.equal(rows.lat.value, '42.5');
  assert.equal(rows.customTitle.value, 'Existing dashboard');
  assert.equal(rows.extraLegacySetting.value, 'preserved');
  assert.equal(rows.useOrdering.value, defaults.useOrdering);
});

test('migration: initializes defaults when no legacy file exists', async () => {
  const { calls, query } = migrationQuery();
  const run = migration(async () => {
    const error = new Error('Missing configuration');
    error.code = 'ENOENT';
    throw error;
  });
  await run.up(query);
  assert.equal(calls.rows.length, Object.keys(defaults).length);
});

test('migration: rejects malformed configuration before changing schema', async () => {
  const { calls, query } = migrationQuery();
  const run = migration(async () => JSON.stringify({ lat: { unexpected: true } }));
  await assert.rejects(run.up(query), /Invalid configuration value for lat/);
  assert.equal(calls.sql, null);
  assert.equal(calls.committed, false);
});
