const express = require('express');
const { readdir } = require('fs/promises');
const { join } = require('path');

const router = express.Router();
const fontDirectory = join(__dirname, '../data/clock-fonts');

router.get('/', async (req, res, next) => {
  try {
    const entries = await readdir(fontDirectory, { withFileTypes: true })
      .catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });

    const fonts = entries
      .filter((entry) => entry.isFile() && /\.(ttf|otf|woff2?)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: fonts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
