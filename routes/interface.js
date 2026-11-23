const express = require('express');
const { auth, requireAuth, asyncWrapper } = require('../middleware');
const { sequelize } = require('../db');
const Quote = require('../models/Quote');
const saveConfig = require('../utils/saveConfig');
const loadConfig = require('../utils/loadConfig');
const validateQuotes = require('../utils/validateQuotes');

const router = express.Router();

router.put('/', auth, requireAuth, asyncWrapper(async (req, res) => {
  const { config, quotes } = req.body;
  if (!validateQuotes(quotes)) {
    return res.status(400).json({ success: false, error: 'Invalid quote list' });
  }

  await sequelize.transaction(async (transaction) => {
    await saveConfig(config, transaction);
    await Quote.destroy({ where: {}, transaction });
    await Quote.bulkCreate(quotes.map((text) => ({ text: text.trim() })), { transaction });
  });

  res.json({ success: true, data: await loadConfig() });
}));

module.exports = router;
