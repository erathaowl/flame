const express = require('express');
const { auth, requireAuth, asyncWrapper } = require('../middleware');
const { sequelize } = require('../db');
const Quote = require('../models/Quote');
const Setting = require('../models/Setting');
const validateQuotes = require('../utils/validateQuotes');
const loadConfig = require('../utils/loadConfig');
const saveConfig = require('../utils/saveConfig');
const { readSecret, saveSecret, validateSource, fetchQuote, currentSource } = require('../utils/quoteEndpoint');

const router = express.Router();

router.get('/random', asyncWrapper(async (req, res) => {
  const config = await loadConfig();
  let quote = null;
  if (config.quoteSource === 'endpoint' && config.quoteEndpointUrl) {
    try {
      quote = (await fetchQuote(await currentSource(), await readSecret())).quote;
    } catch (error) {
      // Preserve the local library as a fallback if the endpoint is unavailable.
    }
  }
  if (quote === null) {
    const count = await Quote.count();
    const local = count ? await Quote.findOne({ offset: Math.floor(Math.random() * count) }) : null;
    quote = local ? local.text : null;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, data: quote });
}));

router.get('/source', auth, requireAuth, asyncWrapper(async (req, res) => {
  res.json({ success: true, data: { hasSecret: Boolean(await readSecret()) } });
}));

router.post('/test', auth, requireAuth, asyncWrapper(async (req, res) => {
  try {
    const source = req.body;
    const secret = source.authValue === undefined ? await readSecret() : source.authValue;
    const quote = await fetchQuote(source, secret);
    return res.json({ success: true, data: quote });
  } catch (error) {
    return res.status(400).json({ success: false, error: 'Quote endpoint test failed: ' + (
      error.message.startsWith('Invalid') || error.message.startsWith('Unsupported') ||
      error.message.startsWith('No quote') || error.message.startsWith('Only HTTP')
        ? error.message : 'request failed or returned invalid JSON'
    ) });
  }
}));

router.put('/source', auth, requireAuth, asyncWrapper(async (req, res) => {
  const { source, authValue, ...details } = req.body;
  if (!['local', 'endpoint'].includes(source)) {
    return res.status(400).json({ success: false, error: 'Invalid quote source' });
  }
  const settings = {
    quoteSource: source,
    quoteEndpointUrl: details.url,
    quoteEndpointAuthMode: details.authMode,
    quoteEndpointQueryName: details.queryName,
    quoteTextPath: details.textPath,
    quoteAuthorPath: details.authorPath,
  };
  try {
    if (source === 'endpoint') validateSource(details);
    else if (details.url) validateSource(details);
    if (authValue !== undefined && (typeof authValue !== 'string' || authValue.length > 2048)) {
      throw new Error('Invalid authentication value');
    }
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
  await sequelize.transaction(async (transaction) => {
    await saveConfig(settings, transaction);
    await saveSecret(authValue, transaction);
  });
  return res.json({ success: true, data: { hasSecret: Boolean(await readSecret()) } });
}));

router.get('/', auth, requireAuth, asyncWrapper(async (req, res) => {
  const quotes = await Quote.findAll({ order: [['id', 'ASC']] });
  res.json({ success: true, data: quotes.map((quote) => quote.text) });
}));

router.put('/', auth, requireAuth, asyncWrapper(async (req, res) => {
  const quotes = req.body.quotes;
  if (!validateQuotes(quotes)) {
    return res.status(400).json({ success: false, error: 'Invalid quote list' });
  }

  await sequelize.transaction(async (transaction) => {
    await Quote.destroy({ where: {}, transaction });
    if (quotes.length) {
      await Quote.bulkCreate(quotes.map((text) => ({ text: text.trim() })), { transaction });
    }
  });
  return res.json({ success: true, data: { count: quotes.length } });
}));

module.exports = router;
