const assert = require('node:assert/strict');
const test = require('node:test');
const { validRefreshInterval, cachedQuote, clearQuoteCache } = require('../utils/quoteCache');

test('quote cache throttles requests, shares concurrent fetches, and retains successful quotes', async (t) => {
  let now = 100000;
  t.mock.method(Date, 'now', () => now);
  clearQuoteCache();
  let calls = 0;
  let failing = false;
  const fetch = async () => {
    calls++;
    if (failing) throw new Error('Endpoint unavailable');
    return 'Quote ' + calls;
  };
  try {
    assert.deepEqual(await Promise.all([
      cachedQuote('source', 60, fetch),
      cachedQuote('source', 60, fetch),
    ]), ['Quote 1', 'Quote 1']);
    assert.equal(calls, 1);
    now += 59999;
    assert.equal(await cachedQuote('source', 60, fetch), 'Quote 1');
    now++;
    assert.equal(await cachedQuote('source', 60, fetch), 'Quote 2');

    failing = true;
    now += 60000;
    assert.equal(await cachedQuote('source', 60, fetch), 'Quote 2');
    assert.equal(await cachedQuote('source', 60, fetch), 'Quote 2');
    assert.equal(calls, 3);

    // Configuration changes must not reuse the old quote.
    assert.equal(await cachedQuote('changed', 60, fetch), null);
    assert.equal(await cachedQuote('changed', 60, fetch), null);
    assert.equal(calls, 4);
    failing = false;
    assert.equal(await cachedQuote('changed', 300, fetch), 'Quote 5');
    assert.equal(await cachedQuote('changed', 0, fetch), 'Quote 6');
    assert.equal(await cachedQuote('changed', 0, fetch), 'Quote 7');
    clearQuoteCache();
    assert.equal(await cachedQuote('changed', 60, fetch), 'Quote 8');
  } finally {
    clearQuoteCache();
  }
});

test('quote refresh interval accepts only supported numeric values', () => {
  for (const value of [0, 60, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400]) {
    assert.equal(validRefreshInterval(value), true);
  }
  for (const value of [-1, 1, 61, 86401, '60', null, undefined]) {
    assert.equal(validRefreshInterval(value), false);
  }
});
