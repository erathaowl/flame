const assert = require('node:assert/strict');
const test = require('node:test');
const { getStatus, isGatusUrl } = require('../utils/gatusStatus');

const sample = (results) => ({
  name: 'Backend',
  group: 'core',
  key: 'core_backend',
  results,
});

const success = (timestamp, value) => ({ timestamp, success: value, status: value ? 200 : 500 });

test('Gatus: latest successful result is green', () => {
  assert.equal(getStatus(sample([
    success('2026-11-22T12:00:00Z', true),
    success('2026-11-22T11:59:00Z', true),
  ])), 'green');
});

test('Gatus: latest failed result is red', () => {
  assert.equal(getStatus(sample([
    success('2026-11-22T11:59:00Z', true),
    success('2026-11-22T12:00:00Z', false),
  ])), 'red');
});

test('Gatus: recovering from a recent failure is yellow', () => {
  assert.equal(getStatus(sample([
    success('2026-11-22T12:00:00Z', true),
    success('2026-11-22T11:59:00Z', false),
  ])), 'yellow');
});

test('Gatus: invalid or empty history is yellow', () => {
  assert.equal(getStatus(null), 'yellow');
  assert.equal(getStatus(sample([])), 'yellow');
  assert.equal(getStatus([{ key: 'core_backend' }]), 'yellow');
});

test('Gatus: accept only per-endpoint status API URLs', () => {
  assert.equal(isGatusUrl('https://status.example.com/api/v1/endpoints/core_backend/statuses'), true);
  assert.equal(isGatusUrl('http://gatus:8080/api/v1/endpoints/core_backend/statuses'), true);
  assert.equal(isGatusUrl('https://status.example.com/api/v1/endpoints/statuses'), false);
  assert.equal(isGatusUrl('https://status.example.com/api/v1/endpoints/core_backend/uptimes/24h'), false);
  assert.equal(isGatusUrl('https://user:secret@status.example.com/api/v1/endpoints/core_backend/statuses'), false);
  assert.equal(isGatusUrl('file:///etc/passwd'), false);
});
