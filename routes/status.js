const express = require('express');
const axios = require('axios');
const App = require('../models/App');
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
  const apps = await App.findAll();
  const visibleApps = req.isAuthenticated
    ? apps
    : apps.filter((app) => Boolean(app.isPublic));
  const monitoredApps = visibleApps.filter((app) => app.statusEndpoint);
  const statuses = {};

  for (let index = 0; index < monitoredApps.length; index += 6) {
    await Promise.all(monitoredApps.slice(index, index + 6).map(async (app) => {
      statuses[app.id] = await fetchStatus(app.statusEndpoint);
    }));
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, data: statuses });
}));

module.exports = router;
