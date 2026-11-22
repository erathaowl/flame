const express = require('express');
const axios = require('axios');
const App = require('../models/App');
const { Op } = require('sequelize');
const { auth, asyncWrapper } = require('../middleware');
const { getStatus, isGatusUrl } = require('../utils/gatusStatus');

const router = express.Router();
const cache = new Map();
const CACHE_MS = 30000;

const fetchStatus = async (url) => {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.status;

  let status = 'yellow';
  if (isGatusUrl(url)) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 0,
        maxContentLength: 262144,
        headers: { Accept: 'application/json' },
      });
      status = getStatus(response.data);
    } catch {
      status = 'yellow';
    }
  }
  cache.set(url, { status, expires: Date.now() + CACHE_MS });
  return status;
};

router.get('/', auth, asyncWrapper(async (req, res) => {
  const where = { statusEndpoint: { [Op.ne]: '' } };
  if (!req.isAuthenticated) where.isPublic = true;

  const apps = await App.findAll({
    attributes: ['id', 'statusEndpoint'],
    where,
  });
  const statuses = {};
  const requests = new Map();

  for (let index = 0; index < apps.length; index += 6) {
    await Promise.all(apps.slice(index, index + 6).map(async (app) => {
      if (!requests.has(app.statusEndpoint)) {
        requests.set(app.statusEndpoint, fetchStatus(app.statusEndpoint));
      }
      statuses[app.id] = await requests.get(app.statusEndpoint);
    }));
  }

  for (const [url, entry] of cache) {
    if (entry.expires <= Date.now()) cache.delete(url);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, data: statuses });
}));

module.exports = router;
