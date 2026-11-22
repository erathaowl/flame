const express = require('express');
const { readFile, writeFile } = require('fs/promises');
const { auth, requireAuth, asyncWrapper } = require('../middleware');
const { sequelize } = require('../db');
const App = require('../models/App');
const Category = require('../models/Category');
const Bookmark = require('../models/Bookmark');
const loadConfig = require('../utils/loadConfig');
const { parseBackup, exportBackup } = require('../utils/backupData');

const router = express.Router();
router.use(auth, requireAuth);

router.get('/', asyncWrapper(async (req, res) => {
  const [applications, categories, config] = await Promise.all([
    App.findAll({ order: [['orderId', 'ASC'], ['id', 'ASC']] }),
    Category.findAll({
      include: [{ model: Bookmark, as: 'bookmarks' }],
      order: [['orderId', 'ASC'], ['id', 'ASC']],
    }),
    loadConfig(),
  ]);

  const document = exportBackup({
    applications,
    categories: categories.map((category) => ({
      ...category.get({ plain: true }),
      bookmarks: category.bookmarks
        .slice()
        .sort((a, b) => (a.orderId || 0) - (b.orderId || 0)),
    })),
    sorting: config.useOrdering,
  });

  res.setHeader('Content-Type', 'application/x-yaml; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="flame-backup.yaml"');
  res.setHeader('Cache-Control', 'no-store');
  res.send(document);
}));

router.post('/', express.text({
  type: ['application/x-yaml', 'text/yaml', 'text/plain'],
  limit: '2mb',
}), asyncWrapper(async (req, res) => {
  let data;
  try {
    data = parseBackup(req.body);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const configFile = 'data/config.json';
  const currentConfig = await readFile(configFile, 'utf8');
  const config = JSON.parse(currentConfig);
  config.useOrdering = data.sorting;

  await sequelize.transaction(async (transaction) => {
    await Bookmark.destroy({ where: {}, transaction });
    await Category.destroy({ where: {}, transaction });
    await App.destroy({ where: {}, transaction });

    for (const app of data.applications) {
      await App.create(app, { transaction });
    }

    for (const category of data.categories) {
      const { bookmarks, ...attributes } = category;
      const created = await Category.create(attributes, { transaction });
      for (const bookmark of bookmarks) {
        await Bookmark.create({ ...bookmark, categoryId: created.id }, { transaction });
      }
    }

    await writeFile(configFile, JSON.stringify(config));
  });

  return res.json({
    success: true,
    data: {
      applications: data.applications.length,
      categories: data.categories.length,
      bookmarks: data.categories.reduce((count, category) => count + category.bookmarks.length, 0),
    },
  });
}));

module.exports = router;
