const refreshIntervals = [0, 60, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400];

const validRefreshInterval = (value) => refreshIntervals.includes(value);

let cache;

const clearQuoteCache = () => { cache = undefined; };

const cachedQuote = async (key, interval, fetchQuote) => {
  if (!validRefreshInterval(interval) || interval === 0) {
    clearQuoteCache();
    return fetchQuote();
  }

  if (!cache || cache.key !== key || cache.interval !== interval) {
    cache = { key, interval, quote: null, nextRequestAt: 0, pending: null };
  }

  const entry = cache;
  if (entry.pending) return entry.pending;
  const now = Date.now();
  if (now < entry.nextRequestAt) return entry.quote;

  entry.nextRequestAt = now + interval * 1000;
  entry.pending = Promise.resolve()
    .then(fetchQuote)
    .then((quote) => { entry.quote = quote; })
    .catch(() => {
      // Keep the last successful quote and throttle failed requests too.
    })
    .finally(() => { entry.pending = null; })
    .then(() => entry.quote);
  return entry.pending;
};

module.exports = { validRefreshInterval, cachedQuote, clearQuoteCache };
