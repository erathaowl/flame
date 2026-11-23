const { join } = require('path');
const express = require('express');
const { errorHandler } = require('./middleware');

const api = express();

// Cache HTML and configuration carefully while allowing versioned assets to be cached.
const publicDirectory = join(__dirname, 'public');
const fontDirectory = join(__dirname, 'data/clock-fonts');
const revalidate = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  next();
};

api.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
api.use('/clock-fonts', revalidate, express.static(fontDirectory));
api.use('/clock-fonts', express.static(join(publicDirectory, 'clock-fonts'), { fallthrough: false }));
api.use('/uploads', express.static(join(__dirname, 'data/uploads')));
api.use(express.static(publicDirectory, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('/index.html') ||
        filePath.endsWith('/clock-fonts.css') ||
        filePath.endsWith('/flame.css')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (/\/static\/(js|css|media)\//.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
api.get(/^\/(?!api|clock-fonts(?:\/|$))/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(join(publicDirectory, 'index.html'));
});

// Body parser
api.use(express.json());

// Link controllers with routes
api.use('/api/apps', require('./routes/apps'));
api.use('/api/status', require('./routes/status'));
api.use('/api/quotes', require('./routes/quotes'));
api.use('/api/interface', require('./routes/interface'));
api.use('/api/backup', require('./routes/backup'));
api.use('/api/config', require('./routes/config'));
api.use('/api/clock-fonts', require('./routes/clockFonts'));
api.use('/api/weather', require('./routes/weather'));
api.use('/api/categories', require('./routes/category'));
api.use('/api/bookmarks', require('./routes/bookmark'));
api.use('/api/queries', require('./routes/queries'));
api.use('/api/auth', require('./routes/auth'));
api.use('/api/themes', require('./routes/themes'));

// Custom error handler
api.use(errorHandler);

module.exports = api;
