const express = require('express');
const { auth, requireAuth, asyncWrapper } = require('../middleware');
const { sequelize } = require('../db');
const Quote = require('../models/Quote');
const validateQuotes = require('../utils/validateQuotes');

const router = express.Router();

router.get('/random', asyncWrapper(async (req, res) => {
  const count = await Quote.count();
  const quote = count
    ? await Quote.findOne({ offset: Math.floor(Math.random() * count) })
    : null;
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, data: quote ? quote.text : null });
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
