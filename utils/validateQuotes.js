const validateQuotes = (quotes) =>
  Array.isArray(quotes) &&
  quotes.every((quote) =>
    typeof quote === 'string' && Boolean(quote.trim()) && quote.length <= 2000
  );

module.exports = validateQuotes;
