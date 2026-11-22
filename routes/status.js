const express = require('express');
const axios = require('axios');
const loadConfig = require('../utils/loadConfig');
const { getStatus } = require('../utils/gatusStatus');
const { asyncWrapper } = require('../middleware');

const router = express.Router();
let cache = { url: '', expires: 0, data: {} };

router.get('/', asyncWrapper(async (req, res) => {
  const { gatusUrl = '' } = await loadConfig();
  res.setHeader('Cache-Control', 'no-store');
  if (!gatusUrl) return res.json({ success: true, data: {} });

  let url;
  try {
    url = new URL(gatusUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Invalid Gatus URL');
    }
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid Gatus URL' });
  }

  if (cache.url === gatusUrl && Date.now() < cache.expires) {
    return res.json({ success: true, data: cache.data });
  }

  try {
    url.pathname = url.pathname.replace(/\/$/, '') + '/api/v1/endpoints/statuses';
    url.search = '';
    const response = await axios.get(url.toString(), {
      timeout: 5000,
      maxRedirects: 0,
      maxContentLength: 2 * 1024 * 1024,
    });
    if (!Array.isArray(response.data)) throw new Error('Unexpected Gatus response');
    const statuses = Object.fromEntries(
      response.data.filter((entry) => typeof entry.key === 'string')
        .map((entry) => [entry.key, getStatus(entry)])
    );
    cache = { url: gatusUrl, expires: Date.now() + 30000, data: statuses };
    return res.json({ success: true, data: statuses });
  } catch {
    return res.status(502).json({ success: false, error: 'Gatus unavailable' });
  }
}));

module.exports = router;
