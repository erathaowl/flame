const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../utils/backupData.js'),
  'utf8'
);
const moduleRef = { exports: {} };

// JSON is also valid YAML. This stub tests the backup schema without installing dependencies.
const yaml = {
  load: (text) => JSON.parse(text),
  dump: (value) => JSON.stringify(value),
};

const load = vm.runInNewContext(
  '(function (require, module) { ' + source + '\n})'
);
load((name) => {
  assert.equal(name, 'js-yaml');
  return yaml;
}, moduleRef);

const { parseBackup, exportBackup } = moduleRef.exports;

const sample = {
  sorting: 'orderId',
  applications: [
    {
      id: 81,
      name: 'Private App',
      url: 'https://app.example.com',
      icon: 'server',
      description: 'Dashboard',
      statusEndpoint: 'https://gatus.example.com/api/v1/endpoints/services_app/statuses',
      isPublic: 0,
      isPinned: true,
      orderId: 4,
    },
  ],
  categories: [
    {
      id: 92,
      name: 'References',
      isPublic: true,
      isPinned: false,
      orderId: 2,
      bookmarks: [
        {
          id: 47,
          name: 'Documentation',
          url: 'https://docs.example.com',
          icon: 'book',
          isPublic: false,
          orderId: 3,
        },
      ],
    },
  ],
};

test('YAML backup preserves order, visibility, pinning and status URLs', () => {
  const restored = parseBackup(exportBackup(sample));
  assert.equal(restored.sorting, 'orderId');
  assert.equal(restored.applications[0].name, 'Private App');
  assert.equal(restored.applications[0].isPublic, false);
  assert.equal(restored.applications[0].isPinned, true);
  assert.equal(restored.applications[0].orderId, 4);
  assert.equal(restored.applications[0].statusEndpoint, sample.applications[0].statusEndpoint);
  assert.equal(restored.categories[0].orderId, 2);
  assert.equal(restored.categories[0].isPinned, false);
  assert.equal(restored.categories[0].bookmarks[0].isPublic, false);
  assert.equal(restored.categories[0].bookmarks[0].orderId, 3);
  assert.equal(Object.hasOwn(restored.applications[0], 'id'), false);
  assert.equal(Object.hasOwn(restored.categories[0], 'id'), false);
});

test('YAML backup rejects invalid version and visibility values', () => {
  const valid = JSON.parse(exportBackup(sample));
  assert.throws(
    () => parseBackup(JSON.stringify({ ...valid, version: 2 })),
    /Unsupported backup format/
  );
  valid.applications[0].isPublic = 'false';
  assert.throws(
    () => parseBackup(JSON.stringify(valid)),
    /Invalid application visibility/
  );
});

test('YAML backup rejects invalid category structures', () => {
  const valid = JSON.parse(exportBackup(sample));
  valid.categories[0].bookmarks = null;
  assert.throws(
    () => parseBackup(JSON.stringify(valid)),
    /Invalid bookmarks/
  );
});
